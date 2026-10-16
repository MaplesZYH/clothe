import type { Sql } from "postgres";

export type GarmentSource = {
  objectKey: string;
  sourceHash: string;
  mimeType: "image/jpeg" | "image/png";
};

export type GarmentJobResult = {
  batchId: string;
  jobId: string;
  ledgerId: string;
  reusedGarmentIds: string[];
  queuedGarmentIds: string[];
};

type IdRow = { id: string };
type LedgerRow = { id: string; amount: number };
type ExistingJobRow = { id: string; batch_id: string | null };

export async function createGarmentBatchAndJob(
  sql: Sql<Record<string, unknown>>,
  input: { ownerId: string; operationKey: string; processingCredits: number; sources: GarmentSource[] }
): Promise<GarmentJobResult> {
  if (input.sources.length < 2 || input.sources.length > 5) throw new Error("GARMENT_BATCH_SIZE_INVALID");

  return sql.begin(async (transaction) => {
    const tx = transaction as unknown as Sql<Record<string, unknown>>;
    await tx`
      insert into public.owners (id, kind)
      values (${input.ownerId}, 'anonymous')
      on conflict (id) do nothing
    `;
    await tx`
      insert into public.wallets (owner_id, balance)
      values (${input.ownerId}, 0)
      on conflict (owner_id) do nothing
    `;

    const existingLedger = await tx<LedgerRow[]>`
      select id, amount from public.credit_ledger where operation_key = ${input.operationKey} limit 1
    `;
    let ledgerId: string;
    if (existingLedger[0]) {
      ledgerId = existingLedger[0].id;
      const existingJob = await tx<ExistingJobRow[]>`
        select id, batch_id from public.processing_jobs where idempotency_key = ${input.operationKey} limit 1
      `;
      if (existingJob[0] && existingJob[0].batch_id) {
        return {
          batchId: existingJob[0].batch_id,
          jobId: existingJob[0].id,
          ledgerId,
          reusedGarmentIds: [],
          queuedGarmentIds: []
        };
      }
    } else {
      const wallet = await tx<{ balance: number }[]>`
        select balance from public.wallets where owner_id = ${input.ownerId} for update
      `;
      if (!wallet[0] || wallet[0].balance < input.processingCredits) throw new Error("INSUFFICIENT_CREDITS");
      const ledger = await tx<IdRow[]>`
        insert into public.credit_ledger (owner_id, kind, amount, operation_key, metadata)
        values (${input.ownerId}, 'debit', ${-input.processingCredits}, ${input.operationKey}, ${JSON.stringify({ action: "garment_processing" })}::jsonb)
        returning id
      `;
      ledgerId = ledger[0]!.id;
      await tx`
        update public.wallets set balance = balance - ${input.processingCredits}, updated_at = now()
        where owner_id = ${input.ownerId}
      `;
    }

    const batch = await tx<IdRow[]>`
      insert into public.garment_batches (owner_id, source_count, status)
      values (${input.ownerId}, ${input.sources.length}, 'processing')
      returning id
    `;
    const batchId = batch[0]!.id;
    const reusedGarmentIds: string[] = [];
    const queuedGarmentIds: string[] = [];
    for (const source of input.sources) {
      const existing = await tx<IdRow[]>`
        select id from public.garments
        where owner_id = ${input.ownerId} and source_hash = ${source.sourceHash} and deleted_at is null
        limit 1
      `;
      if (existing[0]) {
        reusedGarmentIds.push(existing[0].id);
        continue;
      }
      const garment = await tx<IdRow[]>`
        insert into public.garments (owner_id, batch_id, source_hash, quality_status)
        values (${input.ownerId}, ${batchId}, ${source.sourceHash}, 'processing')
        returning id
      `;
      queuedGarmentIds.push(garment[0]!.id);
    }

    const job = await tx<IdRow[]>`
      insert into public.processing_jobs (owner_id, batch_id, kind, state, idempotency_key, source_keys)
      values (
        ${input.ownerId}, ${batchId}, 'garment_processing', 'queued', ${input.operationKey},
        ${JSON.stringify(input.sources.map((source) => source.objectKey))}::jsonb
      )
      on conflict (idempotency_key) do update set updated_at = now()
      returning id
    `;
    await tx`
      insert into public.outbox_events (topic, aggregate_id, payload)
      values ('garment.processing.requested', ${job[0]!.id}, ${JSON.stringify({ batchId })}::jsonb)
    `;
    return { batchId, jobId: job[0]!.id, ledgerId, reusedGarmentIds, queuedGarmentIds };
  });
}
