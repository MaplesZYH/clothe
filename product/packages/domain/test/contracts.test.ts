import { describe, expect, it } from "vitest";

import {
  createAnonymousSessionToken,
  DomainError,
  parseStylingAdvice,
  transitionProcessingState,
  validateUploadBatch,
  verifyAnonymousSessionToken
} from "../src/index.js";

const issueItemId = "11111111-1111-4111-8111-111111111111";
const replacementGarmentId = "22222222-2222-4222-8222-222222222222";

describe("shared domain contracts", () => {
  it("rejects terminal processing transitions", () => {
    expect(() => transitionProcessingState("succeeded", "running")).toThrow(DomainError);
  });

  it("rejects advice that has no typed reason", () => {
    expect(() =>
      parseStylingAdvice({
        issueItemId,
        reasonTypes: [],
        reason: "颜色不协调",
        replacementGarmentId,
        summary: "换一件更轻的鞋"
      })
    ).toThrow(/required schema/);
  });

  it("accepts advice that names a concrete candidate", () => {
    expect(
      parseStylingAdvice({
        issueItemId,
        reasonTypes: ["color"],
        reason: "黑鞋让下半身视觉重量偏重。",
        replacementGarmentId,
        summary: "试试衣物栏中的白鞋。"
      }).replacementGarmentId
    ).toBe(replacementGarmentId);
  });

  it("signs and verifies an anonymous session without exposing the secret", () => {
    const token = createAnonymousSessionToken("33333333-3333-4333-8333-333333333333", "a-local-secret-that-is-long");
    expect(verifyAnonymousSessionToken(token, "a-local-secret-that-is-long")?.ownerId).toBe(
      "33333333-3333-4333-8333-333333333333"
    );
    expect(verifyAnonymousSessionToken(token, "wrong-secret-that-is-long")).toBeNull();
  });

  it("rejects an upload batch with multiple garments in one frame", () => {
    expect(validateUploadBatch({
      files: [
        { name: "top.png", mimeType: "image/png", byteSize: 10, detectedGarmentCount: 2 },
        { name: "shoe.png", mimeType: "image/png", byteSize: 10 }
      ]
    })).toEqual({ ok: false, reasons: ["multiple-garments"] });
  });

  it("reports an oversized source image before any charge", () => {
    expect(validateUploadBatch({
      files: [
        { name: "top.png", mimeType: "image/png", byteSize: 11 * 1024 * 1024 },
        { name: "shoe.png", mimeType: "image/png", byteSize: 10 }
      ]
    })).toEqual({ ok: false, reasons: ["file-size"] });
  });
});
