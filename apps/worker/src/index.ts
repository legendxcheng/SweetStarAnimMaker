export interface StartWorkerResult {
  close(): Promise<void>;
}

export async function startWorker(): Promise<StartWorkerResult> {
  return {
    async close() {},
  };
}
