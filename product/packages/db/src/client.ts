import postgres, { type Sql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

export type OutfitDatabase = PostgresJsDatabase<typeof schema>;

export type DatabaseHandle = {
  db: OutfitDatabase;
  sql: Sql<Record<string, unknown>>;
  close: () => Promise<void>;
};

export function createDatabase(databaseUrl = process.env.DATABASE_URL): DatabaseHandle {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to the outfit board database.");
  }
  const sql = postgres(databaseUrl, { max: 5, prepare: false });
  return {
    db: drizzle(sql, { schema }),
    sql,
    close: () => sql.end({ timeout: 5 })
  };
}
