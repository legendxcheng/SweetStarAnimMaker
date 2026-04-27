import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { ensureRequiredPortsAvailable } from "./backend-launch-config.mjs";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
const runtimeDir = process.env.SWEETSTAR_RUNTIME_DIR ?? path.join(workspaceRoot, ".codex-runtime");
const redisUrlFile = path.join(runtimeDir, "redis-url.txt");
const require = createRequire(import.meta.url);
const tsxCliPath = require.resolve("tsx/cli", {
  paths: [
    path.join(workspaceRoot, "apps", "api"),
    path.join(workspaceRoot, "apps", "worker"),
    workspaceRoot,
  ],
});

/** @type {import("node:child_process").ChildProcessWithoutNullStreams[]} */
const children = [];
let shutdownPromise = null;

fs.mkdirSync(runtimeDir, { recursive: true });
fs.rmSync(redisUrlFile, { force: true });

await ensureRequiredPortsAvailable({
  requiredPorts: [13000],
  contextLabel: "backend stack",
});

function spawnService(name, command, args) {
  console.log(`[backend] starting ${name}`);
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    windowsHide: false,
  });
  child.once("spawn", () => {
    console.log(`[backend] ${name} pid ${child.pid}`);
  });
  return child;
}

async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  try {
    await execFileAsync(
      "taskkill.exe",
      ["/PID", String(pid), "/T", "/F"],
      { windowsHide: true },
    );
  } catch {
    // Ignore processes that already exited.
  }
}

async function shutdownAll(reason, exitCode = 0) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    console.log(`[backend] stopping stack (${reason})`);
    await Promise.all(children.map((child) => killProcessTree(child.pid)));
    process.exit(exitCode);
  })();

  return shutdownPromise;
}

const serviceSpecs = [
  {
    name: "redis",
    command: process.execPath,
    args: [path.join(workspaceRoot, "tooling", "scripts", "start-redis-memory.cjs")],
  },
  {
    name: "api",
    command: process.execPath,
    args: [
      tsxCliPath,
      path.join(workspaceRoot, "tooling", "scripts", "start-api-root.mjs"),
    ],
  },
  {
    name: "worker",
    command: process.execPath,
    args: [
      tsxCliPath,
      path.join(workspaceRoot, "tooling", "scripts", "start-worker-root.mjs"),
    ],
  },
];

for (const spec of serviceSpecs) {
  const child = spawnService(spec.name, spec.command, spec.args);
  children.push(child);

  child.on("exit", (code, signal) => {
    const reason =
      signal ? `${spec.name} received ${signal}` : `${spec.name} exited with code ${code ?? 0}`;
    const exitCode = typeof code === "number" && code !== 0 ? code : 0;
    void shutdownAll(reason, exitCode);
  });

  child.on("error", (error) => {
    console.error(`[backend] ${spec.name} failed to start`, error);
    void shutdownAll(`${spec.name} failed to start`, 1);
  });
}

process.on("SIGINT", () => {
  void shutdownAll("received SIGINT", 0);
});

process.on("SIGTERM", () => {
  void shutdownAll("received SIGTERM", 0);
});

console.log("Backend stack started.");
console.log("API: http://127.0.0.1:13000");
console.log("Redis URL file: .codex-runtime\\redis-url.txt");
console.log("Worker mode: real when VECTORENGINE_API_TOKEN is configured, otherwise smoke.");
