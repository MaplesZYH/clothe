export const workerName = "outfit-board-worker";

export * from "./queue.js";
export * from "./garment-processor.js";
export * from "./runner.js";

export function describeWorker(): string {
  return `${workerName}: awaiting job queue configuration`;
}
