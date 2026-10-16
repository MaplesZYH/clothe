import { DomainError, errorCodes } from "./errors";

export const processingStates = [
  "queued",
  "running",
  "succeeded",
  "needs_cleanup",
  "failed",
  "timed_out"
] as const;

export type ProcessingState = (typeof processingStates)[number];

const transitions: Record<ProcessingState, readonly ProcessingState[]> = {
  queued: ["running", "failed", "timed_out"],
  running: ["succeeded", "needs_cleanup", "failed", "timed_out"],
  succeeded: [],
  needs_cleanup: ["succeeded", "failed"],
  failed: [],
  timed_out: []
};

export function canTransitionProcessingState(from: ProcessingState, to: ProcessingState): boolean {
  return transitions[from].includes(to);
}

export function transitionProcessingState(from: ProcessingState, to: ProcessingState): ProcessingState {
  if (!canTransitionProcessingState(from, to)) {
    throw new DomainError(
      errorCodes.INVALID_STATE_TRANSITION,
      `Processing job cannot transition from ${from} to ${to}.`
    );
  }
  return to;
}
