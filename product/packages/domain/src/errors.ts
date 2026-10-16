export const errorCodes = {
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  INVALID_ADVICE_RESULT: "INVALID_ADVICE_RESULT",
  OWNER_ACCESS_DENIED: "OWNER_ACCESS_DENIED",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS"
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
