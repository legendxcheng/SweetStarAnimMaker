import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "../../apps/api/src/app.ts";
import { loadRootEnv } from "../env/load-env.mjs";
import { resolveRootRedisUrl } from "./backend-launch-config.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
loadRootEnv();
const redisUrl = await resolveRootRedisUrl({ workspaceRoot });

const app = buildApp({
  dataRoot: workspaceRoot,
  redisUrl,
});

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

await app.listen({
  host: "127.0.0.1",
  port: 13000,
});

console.log("api listening on http://127.0.0.1:13000");
