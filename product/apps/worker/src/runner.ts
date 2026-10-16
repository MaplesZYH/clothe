import type { Sql } from "postgres";

import { claimProcessingJob, releaseProcessingJob, type ClaimedProcessingJob } from "./queue.js";
import type { GarmentProcessor, GarmentProcessingOutput } from "./garment-processor.js";

export type SourceStorage = {
  read(key: string): Promise<Uint8Array>;
  write(key: string, bytes: Uint8Array, contentType: "image/png"): Promise<void>;
  remove(key: string): Promise<void>;
};

type GarmentRow = { id: string };
type LedgerRow = { id: string; amount: number; owner_id: string };

function mimeTypeForKey(key: string): "image/jpeg" | "image/png" {
  return key.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

async function refundForJob(sql: Sql<Record<string, unknown>>, jobId: string, reason: string): Promise<void> {
  await sql.begin(async (transaction) => {
    const tx = transaction as unknown as Sql<Record<string, unknown>>;
    const ledger = await tx<LedgerRow[]>`
      select ledger.id, ledger.amount, ledger.owner_id
      from public.credit_ledger ledger
      join public.processing_jobs job on job.id = ${jobId} and ledger.operation_key = job.idempotency_key
      limit 1
    `;
    if (!ledger[0]) return;
    const existing = await tx<{ id: string }[]>`
      select id from public.credit_ledger where refund_for_ledger_id = ${ledger[0].id} limit 1
    `;
    if (existing[0]) return;
    await tx`
      insert into public.credit_ledger (owner_id, kind, amount, operation_key, refund_for_ledger_id, metadata)
      values (${ledger[0].owner_id}, 'refund', ${Math.abs(ledger[0].amount)}, ${`refund:${ledger[0].id}`}, ${ledger[0].id}, ${JSON.stringify({ reason })}::jsonb)
    `;
    await tx`
      update public.wallets set balance = balance + ${Math.abs(ledger[0].amount)}, updated_at = now()
      where owner_id = ${ledger[0].owner_id}
    `;
  });
}

async function persistOutputs(
  sql: Sql<Record<string, unknown>>,
  job: ClaimedProcessingJob,
  outputs: GarmentProcessingOutput[],
  storage: SourceStorage
): Promise<"succeeded" | "needs_cleanup"> {
  const garments = await sql<GarmentRow[]>`
    select id from public.garments where batch_id = ${job.batchId} and quality_status = 'processing' order by created_at asc
  `;
  const hasCleanup = outputs.some((output) => output.status === "needs_cleanup");
  for (const [index, output] of outputs.entries()) {
    const garment = garments[index];
    if (!garment) continue;
    if (output.status === "failed" || !output.pngBytes || !output.width || !output.height) {
      await sql`
        update public.garments set quality_status = 'failed', updated_at = now()
        where id = ${garment.id}
      `;
      continue;
    }
    const objectKey = `garments/${job.ownerId}/${garment.id}/1.png`;
    await storage.write(objectKey, output.pngBytes, "image/png");
    await sql`
      insert into public.garment_assets (garment_id, version, object_key, width, height)
      values (${garment.id}, 1, ${objectKey}, ${output.width}, ${output.height})
      on conflict (garment_id, version) do update set object_key = excluded.object_key, updated_at = now()
    `;
    await sql`
      update public.garments
         set quality_status = ${output.status === "needs_cleanup" ? "needs_cleanup" : "usable"},
             category = ${output.category ?? "other"}, primary_color = ${output.primaryColor ?? null},
             length = ${output.length ?? null}, updated_at = now()
       where id = ${garment.id}
    `;
  }
  return hasCleanup ? "needs_cleanup" : "succeeded";
}

export async function processClaimedGarmentJob(
  sql: Sql<Record<string, unknown>>,
  job: ClaimedProcessingJob,
  processor: GarmentProcessor,
  storage: SourceStorage,
  timeoutMs = 120_000
): Promise<void> {
  const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("GARMENT_PROCESSING_TIMEOUT")), timeoutMs));
  try {
    const work = Promise.all(job.sourceKeys.map(async (sourceKey) => {
      const bytes = await storage.read(sourceKey);
      return processor.process({ sourceKey, bytes, mimeType: mimeTypeForKey(sourceKey) });
    }));
    const outputs = await Promise.race([work, timer]);
    const failed = outputs.some((output) => output.status === "failed");
    if (failed) {
      await sql`update public.garments set quality_status = 'failed', updated_at = now() where batch_id = ${job.batchId}`;
      await sql`update public.garment_batches set status = 'failed', updated_at = now() where id = ${job.batchId}`;
      await refundForJob(sql, job.id, outputs.find((output) => output.reason)?.reason ?? "QUALITY_FAILED");
      await releaseProcessingJob(sql, job.id, "failed", "GARMENT_QUALITY_FAILED");
      return;
    }
    const state = await persistOutputs(sql, job, outputs, storage);
    await sql`update public.garment_batches set status = ${state === "succeeded" ? "complete" : "needs_cleanup"}, updated_at = now() where id = ${job.batchId}`;
    await releaseProcessingJob(sql, job.id, state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GARMENT_PROCESSING_FAILED";
    await sql`update public.garments set quality_status = 'failed', updated_at = now() where batch_id = ${job.batchId}`;
    await sql`update public.garment_batches set status = 'failed', updated_at = now() where id = ${job.batchId}`;
    await refundForJob(sql, job.id, message);
    await releaseProcessingJob(sql, job.id, message === "GARMENT_PROCESSING_TIMEOUT" ? "timed_out" : "failed", message);
  } finally {
    await Promise.allSettled(job.sourceKeys.map((sourceKey) => storage.remove(sourceKey)));
  }
}

export async function runNextGarmentJob(
  sql: Sql<Record<string, unknown>>,
  workerId: string,
  processor: GarmentProcessor,
  storage: SourceStorage
): Promise<boolean> {
  const job = await claimProcessingJob(sql, workerId);
  if (!job) return false;
  await processClaimedGarmentJob(sql, job, processor, storage);
  return true;
}
