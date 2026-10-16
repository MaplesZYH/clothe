import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260923000000_initial.sql", import.meta.url),
  "utf8"
);
const storageMigration = readFileSync(
  new URL("../../../supabase/migrations/20260923000001_storage.sql", import.meta.url),
  "utf8"
);

describe("database migration contract", () => {
  it("contains every owner-scoped table and the duplicate-protection indexes", () => {
    for (const table of ["owners", "wallets", "credit_ledger", "garments", "processing_jobs", "looks", "advice_requests", "payment_orders"]) {
      expect(migration).toContain(`create table public.${table}`);
    }
    expect(migration).toContain("operation_key text not null unique");
    expect(migration).toContain("unique (owner_id, source_hash)");
    expect(migration).toContain("alter table public.garments enable row level security");
  });

  it("keeps every storage bucket private", () => {
    expect(storageMigration).toContain("('outfit-sources', 'outfit-sources', false");
    expect(storageMigration).toContain("('outfit-assets', 'outfit-assets', false");
    expect(storageMigration).toContain("('outfit-looks', 'outfit-looks', false");
  });
});
