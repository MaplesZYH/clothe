import { describe, expect, it } from "vitest";

import { domainPackageName } from "../src/index.js";

describe("domain workspace", () => {
  it("exports the shared package identity", () => {
    expect(domainPackageName).toBe("@outfit/domain");
  });
});
