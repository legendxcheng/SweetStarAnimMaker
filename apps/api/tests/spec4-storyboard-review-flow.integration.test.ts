import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startWorker } from "@sweet-star/worker";
import {
  createLocalDataPaths,
  createSqliteDb,
} from "@sweet-star/services";
import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";
import {
  seedApprovedCharacterSheets,
  seedApprovedMasterPlot,
  seedApprovedSceneSheets,
} from "./storyboard-test-helpers";

const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];
const workers: Array<{ close(): Promise<void> }> = [];
const redisServers: RedisMemoryServer[] = [];

describe("spec4 storyboard review flow", () => {
  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(redisServers.splice(0).map((server) => server.stop()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("rejects the current storyboard and regenerates a new ai version", async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260321_first",
      "task_20260321_regen",
    ]);
    const project = await createProject(app);
    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

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
        url: "/tasks/task_20260321_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const rejectResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {},
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json().id).toBe("task_20260321_regen");

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260321_regen",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const projectDetailResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "storyboard_in_review",
        currentStoryboard: expect.objectContaining({
          title: "Regenerated Sky Choir",
          sourceTaskId: "task_20260321_regen",
        }),
      }),
    );
  });

  it("saves a human-edited storyboard and approves it", async () => {
    const { app, tempDir } = await createIntegrationContext(["task_20260321_first"]);
    const project = await createProject(app);
    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

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
        url: "/tasks/task_20260321_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const saveResponse = await app.instance.inject({
      method: "PUT",
      url: `/projects/${project.id}/storyboard`,
      payload: {
        title: "Manual Sky Choir",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        sourceTaskId: "task_20260321_first",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Manual Opening",
            dramaticPurpose: "Clarify the launch beat.",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 7,
                visual: "Rin steadies the controls under blue stormlight.",
                characterAction: "She exhales and opens the canopy.",
                dialogue: "We do this together.",
                voiceOver: "",
                audio: "Choir harmonics rise under rain.",
                purpose: "Reframe Rin as collaborative.",
              },
            ],
          },
        ],
      },
    });

    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json()).toEqual(
      expect.objectContaining({
        id: "storyboard_generated",
        title: "Manual Sky Choir",
        approvedAt: null,
      }),
    );

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          project.storageDir,
          "storyboard",
          "current.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"title\": \"Manual Sky Choir\"");

    const approveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/approve`,
      payload: {},
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
          id: "storyboard_generated",
          title: "Manual Sky Choir",
          approvedAt: expect.any(String),
        }),
      }),
    );
  });
});

async function createIntegrationContext(taskIds: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec4-flow-"));
  tempDirs.push(tempDir);
  await ensureTestPromptTemplate(tempDir);

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
      premiseText,
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
  let callCount = 0;

  return {
    async generateStoryboard() {
      callCount += 1;

      if (callCount > 1) {
        return {
          rawResponse: "{\"title\":\"Regenerated Sky Choir\"}",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          storyboard: {
            id: "storyboard_generated",
            title: "Regenerated Sky Choir",
            episodeTitle: "Episode 1",
            sourceMasterPlotId: "pending_source_master_plot_id",
            sourceTaskId: null,
            updatedAt: "pending_updated_at",
            approvedAt: null,
            scenes: [
              {
                id: "scene_1",
                order: 1,
                name: "Sharper Opening",
                dramaticPurpose: "Refocus the launch beat.",
                segments: [
                  {
                    id: "segment_1",
                    order: 1,
                    durationSec: 6,
                    visual: "The cockpit tilts toward the comet glow.",
                    characterAction: "Rin tightens her harness and commits.",
                    dialogue: "",
                    voiceOver: "This time I hear the pattern.",
                    audio: "Choir harmonics lock into tempo.",
                    purpose: "Deliver a cleaner opening hook.",
                  },
                ],
              },
            ],
          },
        };
      }

      return {
        rawResponse: "{\"title\":\"Initial Sky Choir\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          id: "storyboard_generated",
          title: "Initial Sky Choir",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "pending_source_master_plot_id",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
          approvedAt: null,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "First Pass",
              dramaticPurpose: "Introduce Rin and the comet.",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "Rain streaks the cockpit while a comet hum grows louder.",
                  characterAction: "Rin reaches for a broken dial.",
                  dialogue: "",
                  voiceOver: "I know that song.",
                  audio: "Static and distant choir.",
                  purpose: "Establish the premise cleanly.",
                },
              ],
            },
          ],
        },
      };
    },
  };
}
