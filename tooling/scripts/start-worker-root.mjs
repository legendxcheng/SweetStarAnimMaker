import path from "node:path";
import { fileURLToPath } from "node:url";

import { startWorker } from "../../apps/worker/src/index.ts";
import { createSmokeStoryboardProvider } from "../../apps/worker/src/dev/smoke-storyboard-provider.ts";
import { loadRootEnv } from "../env/load-env.mjs";
import {
  determineWorkerMode,
  resolveRootRedisUrl,
} from "./backend-launch-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
loadRootEnv();

const redisUrl = await resolveRootRedisUrl({ workspaceRoot });
const workerMode = determineWorkerMode();
const worker = await startWorker({
  workspaceRoot,
  redisUrl,
  masterPlotProvider:
    workerMode === "smoke" ? createSmokeStoryboardProvider() : undefined,
});

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

console.log(`worker started (${workerMode} mode)`);
