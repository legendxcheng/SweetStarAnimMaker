import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";
import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";

describe("spec3 storyboard flow", () => {
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
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec3-flow-"));
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

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl,
      storyboardProvider: createStubStoryboardProvider(),
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

    const storyboardDir = path.join(
      tempDir,
      ".local-data",
      project.storageDir,
      "storyboards",
    );
    await expect(
      fs.readFile(path.join(storyboardDir, "raw", "task_20260317_ab12cd-gemini-response.json"), "utf8"),
    ).resolves.toContain("\"candidates\"");
    await expect(
      fs.readFile(path.join(storyboardDir, "versions", "v1-ai.json"), "utf8"),
    ).resolves.toContain("\"summary\": \"Stub storyboard summary\"");

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const versionRow = db
      .prepare(
        `
          SELECT
            p.current_storyboard_version_id,
            sv.id,
            sv.version_number,
            sv.file_rel_path,
            sv.raw_response_rel_path
          FROM projects p
          JOIN storyboard_versions sv
            ON sv.id = p.current_storyboard_version_id
          WHERE p.id = ?
        `,
      )
      .get(project.id) as
      | {
          current_storyboard_version_id: string;
          id: string;
          version_number: number;
          file_rel_path: string;
          raw_response_rel_path: string;
        }
      | undefined;

    expect(versionRow).toEqual({
      current_storyboard_version_id: "sbv_20260317_ab12cd",
      id: "sbv_20260317_ab12cd",
      version_number: 1,
      file_rel_path: "storyboards/versions/v1-ai.json",
      raw_response_rel_path: "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
    });

    const projectDetailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });
    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json().currentStoryboard).toEqual({
      id: "sbv_20260317_ab12cd",
      projectId: project.id,
      versionNumber: 1,
      kind: "ai",
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      filePath: "storyboards/versions/v1-ai.json",
      createdAt: expect.any(String),
      sourceTaskId: "task_20260317_ab12cd",
    });

    const currentStoryboardResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/current`,
    });
    expect(currentStoryboardResponse.statusCode).toBe(200);
    expect(currentStoryboardResponse.json()).toEqual(
      expect.objectContaining({
        id: "sbv_20260317_ab12cd",
        projectId: project.id,
        summary: "Stub storyboard summary",
        scenes: [
          expect.objectContaining({
            id: "scene_1",
            sceneIndex: 1,
          }),
        ],
      }),
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

function createStubStoryboardProvider() {
  return {
    async generateStoryboard() {
      return {
        rawResponse: {
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        },
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          summary: "Stub storyboard summary",
          scenes: [
            {
              id: "scene_1",
              sceneIndex: 1,
              description: "A enters the room",
              camera: "medium shot",
              characters: ["A"],
              prompt: "medium shot, character A entering a dim room",
            },
          ],
        },
      };
    },
  };
}
