import { z } from "zod";

export const allowedGarmentMimeTypes = ["image/jpeg", "image/png"] as const;
export const maxGarmentFileBytes = 10 * 1024 * 1024;
export const uploadBatchSchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1),
    mimeType: z.enum(allowedGarmentMimeTypes),
    byteSize: z.number().int().positive().max(maxGarmentFileBytes),
    hasVisibleContent: z.boolean().default(true),
    detectedGarmentCount: z.number().int().nonnegative().default(1)
  })).min(2).max(5)
});

export type UploadBatchInput = z.infer<typeof uploadBatchSchema>;

export type UploadRejection = "batch-size" | "file-type" | "file-size" | "empty-image" | "multiple-garments";

export function validateUploadBatch(input: unknown): { ok: true; data: UploadBatchInput } | { ok: false; reasons: UploadRejection[] } {
  const parsed = uploadBatchSchema.safeParse(input);
  if (!parsed.success) {
    const files = input && typeof input === "object" && "files" in input && Array.isArray(input.files) ? input.files : [];
    const reasons = new Set<UploadRejection>();
    if (files.length < 2 || files.length > 5) reasons.add("batch-size");
    for (const file of files) {
      if (!file || typeof file !== "object") {
        reasons.add("file-type");
        continue;
      }
      if (!("mimeType" in file) || !allowedGarmentMimeTypes.includes(file.mimeType as (typeof allowedGarmentMimeTypes)[number])) reasons.add("file-type");
      if (!("byteSize" in file) || typeof file.byteSize !== "number" || file.byteSize > maxGarmentFileBytes) reasons.add("file-size");
    }
    return { ok: false, reasons: reasons.size > 0 ? [...reasons] : ["file-type"] };
  }
  const reasons = new Set<UploadRejection>();
  if (parsed.data.files.some((file) => !file.hasVisibleContent)) reasons.add("empty-image");
  if (parsed.data.files.some((file) => file.detectedGarmentCount > 1)) reasons.add("multiple-garments");
  return reasons.size > 0 ? { ok: false, reasons: [...reasons] } : { ok: true, data: parsed.data };
}
