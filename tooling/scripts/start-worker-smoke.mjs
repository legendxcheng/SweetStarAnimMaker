import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { startWorker } from "../../apps/worker/src/index.ts";
import { createSmokeStoryboardProvider } from "../../apps/worker/src/dev/smoke-storyboard-provider.ts";
import { loadRootEnv } from "../env/load-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
loadRootEnv();
const redisUrlFile = path.join(workspaceRoot, ".codex-runtime", "redis-url.txt");
const redisUrl = process.env.REDIS_URL ?? (await waitForRedisUrl(redisUrlFile));

const worker = await startWorker({
  workspaceRoot,
  redisUrl,
  masterPlotProvider: createSmokeStoryboardProvider(),
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

console.log("worker started");

async function waitForRedisUrl(filePath) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8").trim();
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Redis URL file: ${filePath}`);
}