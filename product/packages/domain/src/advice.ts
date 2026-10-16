import { z } from "zod";

import { DomainError, errorCodes } from "./errors";

export const adviceReasonTypes = ["color", "proportion", "style"] as const;

export const stylingAdviceSchema = z.object({
  issueItemId: z.string().uuid(),
  reasonTypes: z.array(z.enum(adviceReasonTypes)).min(1),
  reason: z.string().trim().min(1).max(500),
  replacementGarmentId: z.string().uuid(),
  summary: z.string().trim().min(1).max(300)
});

export type StylingAdvice = z.infer<typeof stylingAdviceSchema>;

export function parseStylingAdvice(input: unknown): StylingAdvice {
  const result = stylingAdviceSchema.safeParse(input);
  if (!result.success) {
    throw new DomainError(errorCodes.INVALID_ADVICE_RESULT, "AI advice did not match the required schema.");
  }
  return result.data;
}
