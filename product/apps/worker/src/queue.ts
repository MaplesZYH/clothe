import type { Sql } from "postgres";

export type ClaimedProcessingJob = {
  id: string;
  kind: string;
  ownerId: string;
  batchId: string | null;
  sourceKeys: string[];
  attempts: number;
};

export async function claimProcessingJob(
  sql: Sql<Record<string, unknown>>,
  workerId: string,
  leaseSeconds = 300
): Promise<ClaimedProcessingJob | null> {
  const rows = await sql<ClaimedProcessingJob[]>`
    with next_job as (
      select id
      from public.processing_jobs
      where state = 'queued'
         or (state = 'running' and lease_until < now())
      order by created_at asc
      for update skip locked
      limit 1
    )
    update public.processing_jobs job
       set state = 'running',
           attempts = job.attempts + 1,
           lease_until = now() + make_interval(secs => ${leaseSeconds}),
           last_error = null,
           updated_at = now()
      from next_job
     where job.id = next_job.id
     returning job.id, job.kind, job.owner_id as "ownerId", job.batch_id as "batchId",
               job.source_keys as "sourceKeys", job.attempts
  `;
  if (!rows[0]) return null;
  return rows[0];
}

export async function releaseProcessingJob(
  sql: Sql<Record<string, unknown>>,
  jobId: string,
  state: "succeeded" | "needs_cleanup" | "failed" | "timed_out",
  lastError?: string
): Promise<void> {
  await sql`
    update public.processing_jobs
       set state = ${state}, lease_until = null, last_error = ${lastError ?? null}, updated_at = now()
     where id = ${jobId} and state = 'running'
  `;
}
