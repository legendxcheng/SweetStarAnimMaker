import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";
import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";

const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];
const dbs: Array<{ close(): void }> = [];
const workers: Array<{ close(): Promise<void> }> = [];
const redisServers: RedisMemoryServer[] = [];

describe("spec4 storyboard review flow", () => {
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

  it("rejects the current storyboard and regenerates a new ai version", async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260318_first",
      "task_20260318_regen",
    ]);
    const project = await createProject(app);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      storyboardProvider: createReviewAwareStoryboardProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const rejectResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {
        storyboardVersionId: "sbv_20260318_first",
        reason: "Need stronger scene transitions.",
        nextAction: "regenerate",
      },
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json().triggeredTaskId).toBe("task_20260318_regen");

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_regen",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const currentStoryboardResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/current`,
    });

    expect(currentStoryboardResponse.statusCode).toBe(200);
    expect(currentStoryboardResponse.json()).toEqual(
      expect.objectContaining({
        id: "sbv_20260318_regen",
        versionNumber: 2,
        kind: "ai",
        filePath: "storyboards/versions/v2-ai.json",
        summary: "Regenerated storyboard summary",
      }),
    );

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const latestReview = db
      .prepare(
        `
          SELECT action, reason, triggered_task_id
          FROM storyboard_reviews
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `,
      )
      .get(project.id) as
      | { action: string; reason: string; triggered_task_id: string | null }
      | undefined;

    expect(latestReview).toEqual({
      action: "reject",
      reason: "Need stronger scene transitions.",
      triggered_task_id: "task_20260318_regen",
    });
  });

  it("rejects for manual editing, saves a human version, and approves it", async () => {
    const { app, tempDir } = await createIntegrationContext(["task_20260318_first"]);
    const project = await createProject(app);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      storyboardProvider: createReviewAwareStoryboardProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const rejectResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {
        storyboardVersionId: "sbv_20260318_first",
        reason: "Need stronger emotional beat.",
        nextAction: "edit_manually",
      },
    });

    expect(rejectResponse.statusCode).toBe(200);

    const saveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/save-human-version`,
      payload: {
        baseVersionId: "sbv_20260318_first",
        summary: "Manual storyboard summary",
        scenes: [
          {
            id: "scene_1",
            sceneIndex: 1,
            description: "A pauses and smiles.",
            camera: "close-up",
            characters: ["A"],
            prompt: "close-up of character A smiling in warm light",
          },
        ],
      },
    });

    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json()).toEqual(
      expect.objectContaining({
        versionNumber: 2,
        kind: "human",
        filePath: "storyboards/versions/v2-human.json",
      }),
    );

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          project.storageDir,
          "storyboards",
          "versions",
          "v2-human.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"summary\": \"Manual storyboard summary\"");

    const approveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/approve`,
      payload: {
        storyboardVersionId: saveResponse.json().id,
        note: "Approved after manual polish.",
      },
    });

    expect(approveResponse.statusCode).toBe(200);

    const projectDetailResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "storyboard_approved",
        currentStoryboard: expect.objectContaining({
          id: saveResponse.json().id,
          kind: "human",
        }),
      }),
    );
  });
});

async function createIntegrationContext(taskIds: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec4-flow-"));
  tempDirs.push(tempDir);

  const redisServer = new RedisMemoryServer();
  redisServers.push(redisServer);
  const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;
  let taskIndex = 0;
  const instance = buildApp({
    dataRoot: tempDir,
    redisUrl,
    taskIdGenerator: {
      generateTaskId: () => taskIds[taskIndex++] ?? `task_generated_${taskIndex}`,
    },
  });
  apps.push(instance);
  await instance.ready();

  return {
    app: {
      instance,
      redisUrl,
    },
    tempDir,
  };
}

async function createProject(app: { instance: FastifyInstance }) {
  const response = await app.instance.inject({
    method: "POST",
    url: "/projects",
    payload: {
      name: "My Story",
      script: "Scene 1",
    },
  });

  expect(response.statusCode).toBe(201);

  return response.json();
}

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

function createReviewAwareStoryboardProvider() {
  return {
    async generateStoryboard(input: {
      reviewContext?: { reason: string; rejectedVersionId: string };
    }) {
      if (input.reviewContext) {
        return {
          rawResponse: {
            candidates: [{ content: { parts: [{ text: "{}" }] } }],
          },
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          storyboard: {
            summary: "Regenerated storyboard summary",
            scenes: [
              {
                id: "scene_1",
                sceneIndex: 1,
                description: "A re-enters with clearer motivation.",
                camera: "medium shot",
                characters: ["A"],
                prompt: "medium shot, character A returning with stronger emotion",
              },
            ],
          },
        };
      }

      return {
        rawResponse: {
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        },
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          summary: "Initial storyboard summary",
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
