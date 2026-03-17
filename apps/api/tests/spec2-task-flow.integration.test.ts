import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";
import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";

describe("spec2 task flow", () => {
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];
  const dbs: Array<{ close(): void }> = [];
  const workers: Array<{ close(): Promise<void> }> = [];
  const redisServers: RedisMemoryServer[] = [];

  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(redisServers.splice(0).map((server) => server.stop()));
    for (const db of dbs.splice(0)) {
      db.close();
    }
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("processes a storyboard task through api, redis, worker, sqlite, and disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec2-flow-"));
    tempDirs.push(tempDir);

    const redisServer = new RedisMemoryServer();
    redisServers.push(redisServer);
    const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;

    const app = buildApp({
      dataRoot: tempDir,
      redisUrl,
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
    });
    apps.push(app);
    await app.ready();

    const createProjectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = createProjectResponse.json();

    const createTaskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });

    expect(createTaskResponse.statusCode).toBe(201);

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const pendingRow = db
      .prepare("SELECT status FROM tasks WHERE id = ?")
      .get("task_20260317_ab12cd") as { status: string } | undefined;

    expect(pendingRow?.status).toBe("pending");

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl,
    });
    workers.push(worker);

    await waitFor(async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks/task_20260317_ab12cd",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const taskDir = path.join(
      tempDir,
      ".local-data",
      project.storageDir,
      "tasks",
      "task_20260317_ab12cd",
    );

    await expect(fs.readFile(path.join(taskDir, "input.json"), "utf8")).resolves.toContain(
      "\"taskType\": \"storyboard_generate\"",
    );
    await expect(fs.readFile(path.join(taskDir, "output.json"), "utf8")).resolves.toContain(
      "\"summary\": \"Generated placeholder storyboard\"",
    );
    await expect(fs.readFile(path.join(taskDir, "log.txt"), "utf8")).resolves.toContain(
      "storyboard generation succeeded",
    );
  });
});

async function waitFor(assertion: () => Promise<void>, timeoutMs = 10000) {
  const startedAt = Date.now();

  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
