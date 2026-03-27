import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createShotReferenceRecord,
  createShotImageBatchRecord,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createShotScriptStorage,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotImageRepository,
} from "@sweet-star/services";
import type { CurrentShotScript } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("images api", () => {
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("lists the current image batch, loads a frame, updates its prompt, and approves it independently", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/images`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "image_batch_1",
          shotCount: 1,
          totalRequiredFrameCount: 2,
          approvedShotCount: 0,
        }),
        shots: expect.arrayContaining([
          expect.objectContaining({
            id: "shot_ref_1",
            frameDependency: "start_and_end_frame",
            startFrame: expect.objectContaining({ id: "frame_start_1", frameType: "start_frame" }),
            endFrame: expect.objectContaining({ id: "frame_end_1", frameType: "end_frame" }),
          }),
        ]),
      }),
    );

    const frameResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/images/frames/frame_start_1`,
    });

    expect(frameResponse.statusCode).toBe(200);
    expect(frameResponse.json()).toEqual(
      expect.objectContaining({
        id: "frame_start_1",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
      }),
    );

    const updatePromptResponse = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/images/frames/frame_start_1/prompt`,
      payload: {
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
        negativePromptTextCurrent: "低清晰度、重复人物",
      },
    });

    expect(updatePromptResponse.statusCode).toBe(200);
    expect(updatePromptResponse.json()).toEqual(
      expect.objectContaining({
        id: "frame_start_1",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
        negativePromptTextCurrent: "低清晰度、重复人物",
      }),
    );

    const approveResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/frames/frame_start_1/approve`,
      payload: {},
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toEqual(
      expect.objectContaining({
        id: "frame_start_1",
        imageStatus: "approved",
        approvedAt: expect.any(String),
      }),
    );

    const endFrameResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/images/frames/frame_end_1`,
    });

    expect(endFrameResponse.statusCode).toBe(200);
    expect(endFrameResponse.json()).toEqual(
      expect.objectContaining({
        id: "frame_end_1",
        imageStatus: "approved",
        approvedAt: expect.any(String),
      }),
    );
  });

  it("creates batch, prompt-regeneration, and image-generation tasks from image routes", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_images_generate_1")
          .mockReturnValueOnce("task_frame_prompt_1")
          .mockReturnValueOnce("task_frame_image_1"),
      },
    });
    const project = await createProject(app);

    await seedApprovedShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const generateBatchResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/generate`,
      payload: {},
    });

    expect(generateBatchResponse.statusCode).toBe(201);
    expect(generateBatchResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_images_generate_1",
        type: "images_generate",
      }),
    );

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });

    const regeneratePromptResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/frames/frame_start_1/regenerate-prompt`,
      payload: {},
    });

    expect(regeneratePromptResponse.statusCode).toBe(201);
    expect(regeneratePromptResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_frame_prompt_1",
        type: "frame_prompt_generate",
      }),
    );

    const generateImageResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/frames/frame_start_1/generate`,
      payload: {},
    });

    expect(generateImageResponse.statusCode).toBe(201);
    expect(generateImageResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_frame_image_1",
        type: "frame_image_generate",
      }),
    );

    expect(enqueue).toHaveBeenNthCalledWith(1, {
      taskId: "task_images_generate_1",
      queueName: "images-generate",
      taskType: "images_generate",
    });
    expect(enqueue).toHaveBeenNthCalledWith(2, {
      taskId: "task_frame_prompt_1",
      queueName: "frame-prompt-generate",
      taskType: "frame_prompt_generate",
    });
    expect(enqueue).toHaveBeenNthCalledWith(3, {
      taskId: "task_frame_image_1",
      queueName: "frame-image-generate",
      taskType: "frame_image_generate",
    });
  });

  it("regenerates the current image batch while images are generating", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_images_regen_1",
      },
    });
    const project = await createProject(app);

    await seedApprovedShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_generating",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_images_regen_1",
        type: "images_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_images_regen_1",
      queueName: "images-generate",
      taskType: "images_generate",
    });
  });

  it("creates prompt-regeneration tasks for every frame in the current image batch", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_batch_frame_prompt_1")
          .mockReturnValueOnce("task_batch_frame_prompt_2"),
      },
    });
    const project = await createProject(app);

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/regenerate-prompts`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      batchId: "image_batch_1",
      frameCount: 2,
      taskIds: ["task_batch_frame_prompt_1", "task_batch_frame_prompt_2"],
    });
    expect(enqueue).toHaveBeenNthCalledWith(1, {
      taskId: "task_batch_frame_prompt_1",
      queueName: "frame-prompt-generate",
      taskType: "frame_prompt_generate",
    });
    expect(enqueue).toHaveBeenNthCalledWith(2, {
      taskId: "task_batch_frame_prompt_2",
      queueName: "frame-prompt-generate",
      taskType: "frame_prompt_generate",
    });
  });

  it("creates prompt-regeneration tasks only for frames whose prompt generation failed", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_failed_prompt_retry_1"),
      },
    });
    const project = await createProject(app);

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });
    await markImageShotFailedForPrompt(tempDir, {
      projectId: project.id,
      frameId: "frame_start_1",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/regenerate-failed-prompts`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      batchId: "image_batch_1",
      frameCount: 1,
      taskIds: ["task_failed_prompt_retry_1"],
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_failed_prompt_retry_1",
      queueName: "frame-prompt-generate",
      taskType: "frame_prompt_generate",
    });
  });

  it("creates frame-image tasks only for frames whose image generation failed", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_failed_frame_retry_1"),
      },
    });
    const project = await createProject(app);

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });
    await markImageShotFailedForFrame(tempDir, {
      projectId: project.id,
      frameId: "frame_start_1",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/regenerate-failed-frames`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      batchId: "image_batch_1",
      frameCount: 1,
      taskIds: ["task_failed_frame_retry_1"],
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_failed_frame_retry_1",
      queueName: "frame-image-generate",
      taskType: "frame_image_generate",
    });
  });

  it("approves all remaining frames and marks the project as images_approved", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "images_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/images/approve-all`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          approvedShotCount: 1,
        }),
        shots: expect.arrayContaining([
          expect.objectContaining({
            id: "shot_ref_1",
            referenceStatus: "approved",
            startFrame: expect.objectContaining({ id: "frame_start_1", imageStatus: "approved" }),
            endFrame: expect.objectContaining({ id: "frame_end_1", imageStatus: "approved" }),
          }),
        ]),
      }),
    );

    const projectDetailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "images_approved",
      }),
    );
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-images-api-"));
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
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      },
    });

    return created.json();
  }
});

async function seedApprovedShotScript(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const shotScriptStorage = createShotScriptStorage({ paths });

  const shotScript: CurrentShotScript = {
    id: "shot_script_1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard_1",
    sourceTaskId: "task_shot_script_1",
    updatedAt: "2026-03-24T12:00:00.000Z",
    approvedAt: "2026-03-24T12:05:00.000Z",
    segmentCount: 1,
    shotCount: 1,
    totalDurationSec: 6,
    segments: [
      {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        name: "雨夜开场",
        summary: "林在雨夜市场边停下，抬头望向天际。",
        durationSec: 6,
        status: "approved",
        lastGeneratedAt: "2026-03-24T12:00:00.000Z",
        approvedAt: "2026-03-24T12:05:00.000Z",
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            frameDependency: "start_and_end_frame",
            durationSec: 6,
            purpose: "建立雨夜市场与人物关系。",
            visual: "雨夜市场，灯牌和水面反光交错。",
            subject: "林",
            action: "林停下脚步抬头望向天际。",
            dialogue: null,
            os: null,
            audio: "雨声、风铃声、远处低鸣。",
            transitionHint: null,
            continuityNotes: "左肩书包保持一致。",
          },
        ],
      },
    ],
  };

  await shotScriptStorage.writeCurrentShotScript({
    storageDir: input.projectStorageDir,
    shotScript,
  });
  projectRepository.updateCurrentShotScript({
    projectId: input.projectId,
    shotScriptId: shotScript.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "shot_script_approved",
    updatedAt: shotScript.approvedAt ?? shotScript.updatedAt,
  });
  db.close();
}

async function seedImageBatch(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  projectStatus: "images_generating" | "images_in_review" | "images_approved";
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const shotImageRepository = createSqliteShotImageRepository({ db });

  const batch = createShotImageBatchRecord({
    id: "image_batch_1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: "shot_script_1",
    segmentCount: 1,
    createdAt: "2026-03-24T13:00:00.000Z",
    updatedAt: "2026-03-24T13:00:00.000Z",
  });
  const shot = createShotReferenceRecord({
    id: "shot_ref_1",
    batchId: batch.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: "shot_script_1",
    sceneId: "scene_1",
    segmentId: "segment_1",
    shotId: "shot_1",
    shotCode: "S01-SG01-SH01",
    segmentOrder: 1,
    shotOrder: 1,
    durationSec: 6,
    frameDependency: "start_and_end_frame",
    updatedAt: "2026-03-24T13:00:00.000Z",
    startFrame: {
      id: "frame_start_1",
      planStatus: "planned",
      imageStatus: "in_review",
      selectedCharacterIds: ["char_rin_1"],
      matchedReferenceImagePaths: ["character-sheets/characters/char_rin_1/current.png"],
      unmatchedCharacterIds: [],
      promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
      promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
    },
    endFrame: {
      id: "frame_end_1",
      planStatus: "planned",
      imageStatus: "in_review",
      selectedCharacterIds: ["char_rin_1"],
      matchedReferenceImagePaths: ["character-sheets/characters/char_rin_1/current.png"],
      unmatchedCharacterIds: [],
      promptTextSeed: "尾帧定格在林与天际冷白尾光的对视。",
      promptTextCurrent: "尾帧定格在林与天际冷白尾光的对视。",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/end-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
    },
  });

  shotImageRepository.insertBatch(batch);
  shotImageRepository.insertShot?.(shot);
  projectRepository.updateCurrentImageBatch({
    projectId: input.projectId,
    batchId: batch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.projectStatus,
    updatedAt: "2026-03-24T13:05:00.000Z",
  });
  db.close();
}

async function markImageShotFailedForPrompt(
  tempDir: string,
  input: {
    projectId: string;
    frameId: "frame_start_1" | "frame_end_1";
  },
) {
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });
  const shotImageRepository = createSqliteShotImageRepository({ db });
  const shot = await shotImageRepository.findShotById?.("shot_ref_1");

  if (!shot) {
    throw new Error("shot_ref_1 not found");
  }

  const nextShot = {
    ...shot,
    startFrame: {
      ...shot.startFrame,
      planStatus: input.frameId === "frame_start_1" ? ("plan_failed" as const) : shot.startFrame.planStatus,
      promptTextSeed: input.frameId === "frame_start_1" ? "" : shot.startFrame.promptTextSeed,
      promptTextCurrent: input.frameId === "frame_start_1" ? "" : shot.startFrame.promptTextCurrent,
      imageStatus: input.frameId === "frame_start_1" ? ("pending" as const) : shot.startFrame.imageStatus,
      imageAssetPath: input.frameId === "frame_start_1" ? null : shot.startFrame.imageAssetPath,
      provider: input.frameId === "frame_start_1" ? null : shot.startFrame.provider,
      model: input.frameId === "frame_start_1" ? null : shot.startFrame.model,
      updatedAt: "2026-03-24T13:10:00.000Z",
    },
    endFrame:
      shot.endFrame === null
        ? null
        : {
            ...shot.endFrame,
            planStatus: input.frameId === "frame_end_1" ? ("plan_failed" as const) : shot.endFrame.planStatus,
            promptTextSeed: input.frameId === "frame_end_1" ? "" : shot.endFrame.promptTextSeed,
            promptTextCurrent: input.frameId === "frame_end_1" ? "" : shot.endFrame.promptTextCurrent,
            imageStatus: input.frameId === "frame_end_1" ? ("pending" as const) : shot.endFrame.imageStatus,
            imageAssetPath: input.frameId === "frame_end_1" ? null : shot.endFrame.imageAssetPath,
            provider: input.frameId === "frame_end_1" ? null : shot.endFrame.provider,
            model: input.frameId === "frame_end_1" ? null : shot.endFrame.model,
            updatedAt: "2026-03-24T13:10:00.000Z",
          },
    updatedAt: "2026-03-24T13:10:00.000Z",
  };

  await shotImageRepository.updateShot?.(nextShot);
  db.close();
}

async function markImageShotFailedForFrame(
  tempDir: string,
  input: {
    projectId: string;
    frameId: "frame_start_1" | "frame_end_1";
  },
) {
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });
  const shotImageRepository = createSqliteShotImageRepository({ db });
  const shot = await shotImageRepository.findShotById?.("shot_ref_1");

  if (!shot) {
    throw new Error("shot_ref_1 not found");
  }

  const nextShot = {
    ...shot,
    startFrame: {
      ...shot.startFrame,
      planStatus: "planned" as const,
      imageStatus: input.frameId === "frame_start_1" ? ("failed" as const) : shot.startFrame.imageStatus,
      imageAssetPath: input.frameId === "frame_start_1" ? null : shot.startFrame.imageAssetPath,
      provider: input.frameId === "frame_start_1" ? null : shot.startFrame.provider,
      model: input.frameId === "frame_start_1" ? null : shot.startFrame.model,
      updatedAt: "2026-03-24T13:10:00.000Z",
    },
    endFrame:
      shot.endFrame === null
        ? null
        : {
            ...shot.endFrame,
            planStatus: "planned" as const,
            imageStatus: input.frameId === "frame_end_1" ? ("failed" as const) : shot.endFrame.imageStatus,
            imageAssetPath: input.frameId === "frame_end_1" ? null : shot.endFrame.imageAssetPath,
            provider: input.frameId === "frame_end_1" ? null : shot.endFrame.provider,
            model: input.frameId === "frame_end_1" ? null : shot.endFrame.model,
            updatedAt: "2026-03-24T13:10:00.000Z",
          },
    updatedAt: "2026-03-24T13:10:00.000Z",
  };

  await shotImageRepository.updateShot?.(nextShot);
  db.close();
}
