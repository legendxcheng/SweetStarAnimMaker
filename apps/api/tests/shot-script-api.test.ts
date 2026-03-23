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
    segmentCount: 1,
    shotCount: 1,
    totalDurationSec: 4,
    segments: [
      {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        name: "雨夜听见天籁",
        summary: "Rin 在驾驶舱里第一次清楚听见彗星的歌声。",
        durationSec: 6,
        status: "in_review",
        lastGeneratedAt: "2026-03-22T12:25:00.000Z",
        approvedAt: null,
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            durationSec: 4,
            purpose: "建立暴雨驾驶舱与异常歌声的悬念",
            visual: "暴雨敲打驾驶舱玻璃，仪表盘冷光映在 Rin 脸上",
            subject: "Rin",
            action: "Rin 停住手里的操作，抬头听向天外",
            dialogue: null,
            os: "又来了……",
            audio: "远处雷鸣里夹着细长的彗星嗡鸣",
            transitionHint: null,
            continuityNotes: "湿透的挎包始终挂在左肩",
          },
        ],
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
        segments: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
            shots: expect.arrayContaining([
              expect.objectContaining({
                shotCode: "S01-SG01-SH01",
              }),
            ]),
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
          saveSegment: true,
          regenerateSegment: true,
          approveSegment: true,
          approveAll: true,
        },
      }),
    );
  });

  it("saves one shot script segment", async () => {
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
      url: `/projects/${project.id}/shot-script/segments/segment_1`,
      payload: {
        name: "人工修订开场",
        summary: "Rin 在暴雨与彗星歌声中确认异象来自云层之外。",
        durationSec: 6,
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            durationSec: 3,
            purpose: "先压住环境，再把听觉异常推给观众",
            visual: "特写雨水沿挡风玻璃斜划，仪表灯忽明忽暗",
            subject: "Rin",
            action: "Rin 屏息侧耳，手指悬在操纵杆上",
            dialogue: null,
            os: "不是雷声。",
            audio: "彗星低鸣比雷声更近",
            transitionHint: "切至主观视角",
            continuityNotes: "左肩湿挎包保持入镜",
          },
          {
            id: "shot_2",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 2,
            shotCode: "S01-SG01-SH02",
            durationSec: 3,
            purpose: "把异常来源明确到天空",
            visual: "Rin 视线越过玻璃，云层深处隐约亮起冷白尾光",
            subject: "Rin 与天际尾光",
            action: "Rin 缓慢抬头，瞳孔被白光点亮",
            dialogue: null,
            os: null,
            audio: "人声般的长音从云后穿出",
            transitionHint: null,
            continuityNotes: "镜头衔接前一镜的雨痕方向",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseShotScript.id,
        shotCount: 2,
        approvedAt: null,
        segments: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
            name: "人工修订开场",
            shots: expect.arrayContaining([
              expect.objectContaining({ shotCode: "S01-SG01-SH02" }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("approves one shot script segment", async () => {
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
      url: `/projects/${project.id}/shot-script/segments/segment_1/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseShotScript.id,
        approvedAt: expect.any(String),
        segments: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
            status: "approved",
          }),
        ]),
      }),
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("shot_script_approved");
  });

  it("regenerates one shot script segment", async () => {
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
      url: `/projects/${project.id}/shot-script/segments/segment_1/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260322_regen",
        type: "shot_script_segment_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260322_regen",
      queueName: "shot-script-segment-generate",
      taskType: "shot_script_segment_generate",
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
