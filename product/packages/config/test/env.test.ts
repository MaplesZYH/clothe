import { describe, expect, it } from "vitest";

import { getEnv, requireSupabaseEnv } from "../src/env.js";

describe("environment contract", () => {
  it("supports local boot without cloud credentials", () => {
    expect(getEnv({ NODE_ENV: "test" }).AI_PROVIDER).toBe("stub");
  });

  it("requires both public Supabase values when a client is requested", () => {
    expect(() => requireSupabaseEnv({ NODE_ENV: "test" })).toThrow(/Supabase is not configured/);
    expect(
      requireSupabaseEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key"
      }).url
    ).toBe("https://example.supabase.co");
  });
});
