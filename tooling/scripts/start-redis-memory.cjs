const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const runtimeDir = process.env.SWEETSTAR_RUNTIME_DIR || path.join(workspaceRoot, ".codex-runtime");
const outputPath = path.join(runtimeDir, "redis-url.txt");
const redisMemoryServerPath = require.resolve("redis-memory-server", {
  paths: [path.join(workspaceRoot, "apps", "api")],
});
const { RedisMemoryServer } = require(redisMemoryServerPath);

let server;

fs.mkdirSync(runtimeDir, { recursive: true });

(async () => {
  server = new RedisMemoryServer();
  const host = await server.getHost();
  const port = await server.getPort();
  const url = `redis://${host}:${port}`;
  fs.writeFileSync(outputPath, url, "utf8");
  console.log(url);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

const shutdown = async () => {
  if (server) {
    await server.stop();
  }

  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

setInterval(() => {}, 1 << 30);
