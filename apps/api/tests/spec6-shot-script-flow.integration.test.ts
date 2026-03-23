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

  it(
    "generates a shot script, saves a human edit, and approves it",
    async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260322_batch",
      "task_20260322_segment_1",
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
      url: `/projects/${project.id}/shot-script/generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);
    const batchTaskId = createTaskResponse.json().id as string;

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: `/tasks/${batchTaskId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    await waitFor(async () => {
      const currentShotScriptResponse = await app.instance.inject({
        method: "GET",
        url: `/projects/${project.id}/shot-script/current`,
      });

      expect(currentShotScriptResponse.statusCode).toBe(200);
      expect(currentShotScriptResponse.json()).toEqual(
        expect.objectContaining({
          segments: expect.arrayContaining([
            expect.objectContaining({
              segmentId: "segment_1",
              status: "in_review",
            }),
          ]),
        }),
      );
    });

    const saveResponse = await app.instance.inject({
      method: "PUT",
      url: `/projects/${project.id}/shot-script/segments/segment_1`,
      payload: {
        name: "人工修订开场",
        summary: "Rin 在暴雨与天外歌声之间确认异常确实来自天空。",
        durationSec: 6,
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            durationSec: 3,
            purpose: "把驾驶舱压迫感先立住",
            visual: "挡风玻璃上的雨线把 Rin 的侧脸切成数块冷光",
            subject: "Rin",
            action: "Rin 屏住呼吸，手指停在操纵杆边",
            dialogue: null,
            os: "不是雷。",
            audio: "低沉长鸣穿透雨幕",
            transitionHint: "切向天际",
            continuityNotes: "左肩湿挎包不可丢失",
          },
          {
            id: "shot_2",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 2,
            shotCode: "S01-SG01-SH02",
            durationSec: 3,
            purpose: "明确异常来自云层之外",
            visual: "云层深处闪出一道冷白尾光，映亮 Rin 的瞳孔",
            subject: "Rin 与云后尾光",
            action: "Rin 抬头，眼神由困惑转为惊疑",
            dialogue: null,
            os: null,
            audio: "长音像有人在天空里试唱",
            transitionHint: null,
            continuityNotes: "雨痕方向与前镜一致",
          },
        ],
      },
    });

    expect(saveResponse.statusCode).toBe(200);

    const approveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/segments/segment_1/approve`,
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
      }),
    );

    const currentShotScriptResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}/shot-script/current`,
    });

    expect(currentShotScriptResponse.statusCode).toBe(200);
    expect(currentShotScriptResponse.json()).toEqual(
      expect.objectContaining({
        approvedAt: expect.any(String),
        shotCount: 2,
        segments: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
            name: "人工修订开场",
            status: "approved",
          }),
        ]),
      }),
    );
    },
    15_000,
  );

  it(
    "regenerates one segment and keeps the project in shot_script_in_review",
    async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260322_batch",
      "task_20260322_segment_1",
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
      url: `/projects/${project.id}/shot-script/generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);
    const batchTaskId = createTaskResponse.json().id as string;

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: `/tasks/${batchTaskId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    await waitFor(async () => {
      const currentShotScriptResponse = await app.instance.inject({
        method: "GET",
        url: `/projects/${project.id}/shot-script/current`,
      });

      expect(currentShotScriptResponse.statusCode).toBe(200);
      expect(currentShotScriptResponse.json()).toEqual(
        expect.objectContaining({
          segments: expect.arrayContaining([
            expect.objectContaining({
              segmentId: "segment_1",
              status: "in_review",
            }),
          ]),
        }),
      );
    });

    const regenerateResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/shot-script/segments/segment_1/regenerate`,
      payload: {},
    });

    expect(regenerateResponse.statusCode).toBe(201);
    const regenerateTaskId = regenerateResponse.json().id as string;

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: `/tasks/${regenerateTaskId}`,
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
      }),
    );

    const currentShotScriptResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}/shot-script/current`,
    });

    expect(currentShotScriptResponse.statusCode).toBe(200);
    expect(currentShotScriptResponse.json()).toEqual(
      expect.objectContaining({
        shotCount: 1,
        segments: expect.arrayContaining([
          expect.objectContaining({
            segmentId: "segment_1",
            status: "in_review",
            name: "重生成开场段落",
            shots: expect.arrayContaining([
              expect.objectContaining({
                shotCode: "S01-SG01-SH01",
                action: "Rin 顶着雨声缓慢抬头，试图分辨那道歌声",
              }),
            ]),
          }),
        ]),
      }),
    );
    },
    15_000,
  );
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
    async generateShotScriptSegment() {
      callCount += 1;

      if (callCount > 1) {
        return {
          rawResponse: "{\"name\":\"重生成开场段落\"}",
          segment: {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "重生成开场段落",
            summary: "Rin 再次确认歌声来自云层之后的彗星尾光。",
            durationSec: 6,
            status: "in_review",
            lastGeneratedAt: null,
            approvedAt: null,
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 6,
                purpose: "用一个完整镜头把听见与抬头连起来",
                visual: "暴雨中的驾驶舱冷光摇晃，云后忽现一道白色尾痕",
                subject: "Rin",
                action: "Rin 顶着雨声缓慢抬头，试图分辨那道歌声",
                dialogue: null,
                os: "这不是风。",
                audio: "彗星长鸣压过雷声",
                transitionHint: null,
                continuityNotes: "左肩湿挎包继续保留",
              },
            ],
          },
        };
      }

      return {
        rawResponse: "{\"name\":\"初版开场段落\"}",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "初版开场段落",
          summary: "Rin 在暴雨驾驶舱里第一次听见不属于雷声的天外长音。",
          durationSec: 6,
          status: "in_review",
          lastGeneratedAt: null,
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01-SH01",
              durationSec: 4,
              purpose: "建立环境与异响",
              visual: "雨水密集敲打挡风玻璃，驾驶舱只剩冷色仪表灯",
              subject: "Rin",
              action: "Rin 在操作间忽然停住，抬头听向天外",
              dialogue: null,
              os: "又来了……",
              audio: "雷声里混入细长而不自然的嗡鸣",
              transitionHint: "切向视线方向",
              continuityNotes: "湿透挎包留在左肩",
            },
          ],
        },
      };
    },
  };
}
