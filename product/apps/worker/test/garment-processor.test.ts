import { describe, expect, it } from "vitest";

import { qualityGate, StubGarmentProcessor } from "../src/garment-processor.js";

describe("garment quality gate", () => {
  it("accepts high-confidence transparent output", () => {
    expect(qualityGate({ segmentationConfidence: 0.9, visualSimilarity: 0.8 })).toBe("usable");
  });

  it("routes uncertain output to manual cleanup", () => {
    expect(qualityGate({ segmentationConfidence: 0.7, visualSimilarity: 0.7 })).toBe("needs_cleanup");
  });

  it("fails low-confidence output and never fabricates a garment", async () => {
    const output = await new StubGarmentProcessor().process({
      sourceKey: "source.jpg",
      bytes: new Uint8Array([1]),
      mimeType: "image/jpeg"
    });
    expect(output.status).toBe("failed");
    expect(output.pngBytes).toBeUndefined();
  });
});
