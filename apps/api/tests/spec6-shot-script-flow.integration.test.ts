import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startWorker } from "@sweet-star/worker";
import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";
import {
  seedApprovedCharacterSheets,
  seedApprovedMasterPlot,
  seedApprovedStoryboard,
} from "./storyboard-test-helpers";

const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];
const workers: Array<{ close(): Promise<void> }> = [];
const redisServers: RedisMemoryServer[] = [];

describe("spec6 shot script flow", () => {
  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(redisServers.splice(0).map((server) => server.stop()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
  });

  it("generates a shot script, saves a human edit, and approves it", async () => {
    const { app, tempDir } = await createIntegrationContext(["task_20260322_first"]);
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
    await seedApprovedStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      shotScriptProvider: createReviewAwareShotScriptProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/shot-script-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260322_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const saveResponse = await app.instance.inject({
      method: "PUT",
      url: `/projects/${project.id}/shot-script`,
      payload: {
        title: "Manual Shot Script",
        sourceStoryboardId: "storyboard_20260322_ab12cd",
        sourceTaskId: "task_20260322_first",
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Refine the opening beat",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by hanging lanterns",
            actionMoment: "Rin steadies herself before stepping forward",
            emotionTone: "resolved anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime cinematic frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: null,
            durationSec: 4,
          },
        ],
      },
    });

    expect(saveResponse.statusCode).toBe(200);

    const approveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/approve`,
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
        status: "shot_script_approved",
        currentShotScript: expect.objectContaining({
          title: "Manual Shot Script",
          approvedAt: expect.any(String),
        }),
      }),
    );
  });

  it("rejects the current shot script and regenerates a new ai version", async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260322_first",
      "task_20260322_regen",
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
    await seedApprovedStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      shotScriptProvider: createReviewAwareShotScriptProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/shot-script-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260322_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const rejectResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/reject`,
      payload: {
        reason: "Need a bolder visual pass.",
        nextAction: "regenerate",
      },
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json().id).toBe("task_20260322_regen");

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260322_regen",
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
        status: "shot_script_in_review",
        currentShotScript: expect.objectContaining({
          title: "Regenerated Shot Script",
          sourceTaskId: "task_20260322_regen",
        }),
      }),
    );
  });
});

async function createIntegrationContext(taskIds: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec6-flow-"));
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

function createReviewAwareShotScriptProvider() {
  let callCount = 0;

  return {
    async generateShotScript() {
      callCount += 1;

      if (callCount > 1) {
        return {
          rawResponse: "{\"title\":\"Regenerated Shot Script\"}",
          shotScript: {
            id: "shot_script_generated",
            title: "Regenerated Shot Script",
            sourceStoryboardId: "pending_source_storyboard_id",
            sourceTaskId: null,
            updatedAt: "pending_updated_at",
            approvedAt: null,
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01",
                shotPurpose: "Refocus the market entrance",
                subjectCharacters: ["Rin"],
                environment: "Flooded dawn market",
                framing: "medium wide shot",
                cameraAngle: "low angle",
                composition: "Rin framed by reflected neon water",
                actionMoment: "Rin commits to stepping into the market",
                emotionTone: "determined anticipation",
                continuityNotes: "Keep soaked satchel on left shoulder",
                imagePrompt: "anime cinematic frame of Rin entering a flooded market at dawn",
                negativePrompt: null,
                motionHint: null,
                durationSec: 4,
              },
            ],
          },
        };
      }

      return {
        rawResponse: "{\"title\":\"Initial Shot Script\"}",
        shotScript: {
          id: "shot_script_generated",
          title: "Initial Shot Script",
          sourceStoryboardId: "pending_source_storyboard_id",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01",
              shotPurpose: "Establish the flooded market",
              subjectCharacters: ["Rin"],
              environment: "Flooded dawn market",
              framing: "medium wide shot",
              cameraAngle: "eye level",
              composition: "Rin framed by hanging lanterns",
              actionMoment: "Rin pauses at the waterline",
              emotionTone: "uneasy anticipation",
              continuityNotes: "Keep soaked satchel on left shoulder",
              imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
              negativePrompt: null,
              motionHint: null,
              durationSec: 4,
            },
          ],
        },
      };
    },
  };
}
