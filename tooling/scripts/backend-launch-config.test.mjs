import test from "node:test";
import assert from "node:assert/strict";

import {
  buildListWindowsListeningProcessesQuery,
  determineWorkerMode,
  formatPortConflictsMessage,
  getPortConflicts,
  resolveRootRedisUrl,
} from "./backend-launch-config.mjs";

test("determineWorkerMode defaults to real when an api token is present", () => {
  assert.equal(
    determineWorkerMode({
      VECTORENGINE_API_TOKEN: "token",
    }),
    "real",
  );
});

test("determineWorkerMode defaults to smoke when no api token is present", () => {
  assert.equal(determineWorkerMode({}), "smoke");
});

test("determineWorkerMode respects explicit smoke override", () => {
  assert.equal(
    determineWorkerMode({
      VECTORENGINE_API_TOKEN: "token",
      SWEETSTAR_WORKER_MODE: "smoke",
    }),
    "smoke",
  );
});

test("resolveRootRedisUrl prefers the runtime redis url file over REDIS_URL", async () => {
  const redisUrl = await resolveRootRedisUrl({
    workspaceRoot: "E:/repo",
    env: {
      REDIS_URL: "redis://127.0.0.1:6379",
    },
    waitForRedisUrl: async () => "redis://127.0.0.1:3660",
  });

  assert.equal(redisUrl, "redis://127.0.0.1:3660");
});

test("resolveRootRedisUrl falls back to REDIS_URL when the runtime file is unavailable", async () => {
  const redisUrl = await resolveRootRedisUrl({
    workspaceRoot: "E:/repo",
    env: {
      REDIS_URL: "redis://127.0.0.1:6379",
    },
    waitForRedisUrl: async () => {
      throw new Error("Timed out waiting for redis-url.txt");
    },
  });

  assert.equal(redisUrl, "redis://127.0.0.1:6379");
});

test("getPortConflicts returns only required listening ports", () => {
  const conflicts = getPortConflicts({
    requiredPorts: [13000, 14273],
    listeningProcesses: [
      {
        localPort: 13000,
        processId: 35064,
        name: "wslrelay.exe",
        commandLine: " --mode 2 --vm-id {example}",
      },
      {
        localPort: 5432,
        processId: 41200,
        name: "postgres.exe",
        commandLine: "postgres",
      },
    ],
  });

  assert.deepEqual(conflicts, [
    {
      localPort: 13000,
      processId: 35064,
      name: "wslrelay.exe",
      commandLine: " --mode 2 --vm-id {example}",
    },
  ]);
});

test("formatPortConflictsMessage describes the conflicting process", () => {
  const message = formatPortConflictsMessage({
    contextLabel: "backend stack",
    conflicts: [
      {
        localPort: 13000,
        processId: 35064,
        name: "wslrelay.exe",
        commandLine: " --mode 2 --vm-id {example}",
      },
    ],
  });

  assert.equal(
    message,
    [
      "Cannot start backend stack because required ports are already in use:",
      "- 127.0.0.1:13000 -> PID 35064 (wslrelay.exe), command:  --mode 2 --vm-id {example}",
      "Free those ports and retry. stop-all.bat only stops the local smoke processes.",
    ].join("\n"),
  );
});

test("buildListWindowsListeningProcessesQuery separates powershell statements", () => {
  const query = buildListWindowsListeningProcessesQuery();

  assert.match(query, /\$connections = .*\r?\n\$processes = /);
  assert.match(query, /\$processes = .*\r?\n\$connections \| ForEach-Object/);
  assert.doesNotMatch(query, /\{\s*;/);
  assert.doesNotMatch(query, /@\{\s*;/);
});
