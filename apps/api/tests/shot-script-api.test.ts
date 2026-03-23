import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createShotScriptReviewRecord } from "@sweet-star/core";
import type { CurrentShotScript } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";
import { seedCurrentShotScript, seedShotScriptReviewWorkspace } from "./shot-script-test-helpers";
import {
  seedApprovedCharacterSheets,
  seedApprovedMasterPlot,
  seedApprovedStoryboard,
} from "./storyboard-test-helpers";

describe("shot script api", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const baseShotScript: CurrentShotScript = {
    id: "shot_script_20260322_ab12cd",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard_20260322_ab12cd",
    sourceTaskId: "task_20260322_shot_script",
    updatedAt: "2026-03-22T12:25:00.000Z",
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
  };
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
  });

  it("creates a shot script generate task", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_shot_script",
      },
    });
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

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/generate`,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260322_shot_script",
        type: "shot_script_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
      queueName: "shot-script-generate",
      taskType: "shot_script_generate",
    });
  });

  it("returns the current shot script", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      shotScript: baseShotScript,
      status: "shot_script_in_review",
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/shot-script/current`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseShotScript.id,
        shots: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
          }),
        ]),
      }),
    );
  });

  it("returns the shot script review workspace", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedShotScriptReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      shotScript: baseShotScript,
      latestReview: createShotScriptReviewRecord({
        id: "ssr_20260322_latest",
        projectId: project.id,
        shotScriptId: baseShotScript.id,
        action: "reject",
        reason: "Need stronger camera variation.",
        nextAction: "edit_manually",
        createdAt: "2026-03-22T12:30:00.000Z",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/shot-script/review`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectStatus: "shot_script_in_review",
        currentShotScript: expect.objectContaining({
          id: baseShotScript.id,
        }),
        latestReview: expect.objectContaining({
          action: "reject",
        }),
        latestTask: expect.objectContaining({
          id: "task_20260322_shot_script",
          type: "shot_script_generate",
        }),
        availableActions: {
          save: true,
          approve: true,
          reject: true,
        },
      }),
    );
  });

  it("saves the current shot script", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      shotScript: baseShotScript,
      status: "shot_script_in_review",
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/shot-script`,
      payload: {
        ...baseShotScript,
        title: "Episode 1 Shot Script Revised",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseShotScript.id,
        title: "Episode 1 Shot Script Revised",
        approvedAt: null,
      }),
    );
  });

  it("approves the current shot script", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      shotScript: baseShotScript,
      status: "shot_script_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseShotScript.id,
        approvedAt: expect.any(String),
      }),
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("shot_script_approved");
  });

  it("rejects the current shot script and triggers regeneration", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_regen",
      },
    });
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
    await seedCurrentShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      shotScript: baseShotScript,
      status: "shot_script_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/reject`,
      payload: {
        reason: "Need a new visual approach.",
        nextAction: "regenerate",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260322_regen",
        type: "shot_script_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260322_regen",
      queueName: "shot-script-generate",
      taskType: "shot_script_generate",
    });
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: options?.taskQueue,
      taskIdGenerator: options?.taskIdGenerator,
    });
    apps.push(app);
    await app.ready();

    return { app, tempDir };
  }

  async function createProject(app: FastifyInstance) {
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });

    return created.json();
  }
});
