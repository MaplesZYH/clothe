import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const owners = pgTable("owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id"),
  kind: text("kind").notNull().default("anonymous"),
  status: text("status").notNull().default("active"),
  ...timestamps
});

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps
}, (table) => ({ tokenIndex: uniqueIndex("anonymous_sessions_token_hash_idx").on(table.tokenHash) }));

export const wallets = pgTable("wallets", {
  ownerId: uuid("owner_id").primaryKey().references(() => owners.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  ...timestamps
}, (table) => ({ nonNegative: check("wallets_balance_non_negative", sql`${table.balance} >= 0`) }));

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  amount: integer("amount").notNull(),
  operationKey: text("operation_key").notNull(),
  refundForLedgerId: uuid("refund_for_ledger_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
}, (table) => ({
  operationIndex: uniqueIndex("credit_ledger_operation_key_idx").on(table.operationKey),
  refundIndex: uniqueIndex("credit_ledger_refund_for_idx").on(table.refundForLedgerId),
  nonZero: check("credit_ledger_amount_non_zero", sql`${table.amount} <> 0`)
}));

export const garmentBatches = pgTable("garment_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  sourceCount: integer("source_count").notNull(),
  status: text("status").notNull().default("pending"),
  ...timestamps
});

export const garments = pgTable("garments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => garmentBatches.id, { onDelete: "cascade" }),
  sourceHash: text("source_hash").notNull(),
  category: text("category").notNull().default("other"),
  primaryColor: text("primary_color"),
  length: text("length"),
  qualityStatus: text("quality_status").notNull().default("pending"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps
}, (table) => ({ sourceIndex: uniqueIndex("garments_owner_source_hash_idx").on(table.ownerId, table.sourceHash) }));

export const garmentAssets = pgTable("garment_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  garmentId: uuid("garment_id").notNull().references(() => garments.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  objectKey: text("object_key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  ...timestamps
}, (table) => ({ versionIndex: uniqueIndex("garment_assets_version_idx").on(table.garmentId, table.version) }));

export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").references(() => garmentBatches.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  state: text("state").notNull().default("queued"),
  idempotencyKey: text("idempotency_key").notNull(),
  sourceKeys: jsonb("source_keys").$type<string[]>().notNull().default([]),
  attempts: integer("attempts").notNull().default(0),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps
}, (table) => ({ idempotencyIndex: uniqueIndex("processing_jobs_idempotency_idx").on(table.idempotencyKey) }));

export const outboxEvents = pgTable("outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  topic: text("topic").notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps
});

export const looks = pgTable("looks", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  renderKey: text("render_key"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps
});

export const lookItems = pgTable("look_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  lookId: uuid("look_id").notNull().references(() => looks.id, { onDelete: "cascade" }),
  garmentId: uuid("garment_id").notNull().references(() => garments.id, { onDelete: "restrict" }),
  assetVersion: integer("asset_version").notNull(),
  transform: jsonb("transform").$type<Record<string, number>>().notNull(),
  layer: integer("layer").notNull(),
  locked: boolean("locked").notNull().default(false),
  categorySnapshot: text("category_snapshot").notNull(),
  ...timestamps
});

export const adviceRequests = pgTable("advice_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  lookId: uuid("look_id").references(() => looks.id, { onDelete: "set null" }),
  ledgerId: uuid("ledger_id").references(() => creditLedger.id, { onDelete: "set null" }),
  candidateIds: jsonb("candidate_ids").$type<string[]>().notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  state: text("state").notNull().default("queued"),
  result: jsonb("result").$type<Record<string, unknown>>(),
  ...timestamps
});

export const paymentOrders = pgTable("payment_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerOrderId: text("provider_order_id").notNull(),
  state: text("state").notNull().default("created"),
  credits: integer("credits").notNull(),
  amountFen: integer("amount_fen").notNull(),
  ...timestamps
}, (table) => ({ providerOrderIndex: uniqueIndex("payment_orders_provider_order_idx").on(table.provider, table.providerOrderId) }));
