import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createShotReferenceRecord,
  createSegmentVideoRecord,
  createShotImageBatchRecord,
  createVideoBatchRecord,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createShotScriptStorage,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotImageRepository,
  createSqliteVideoRepository,
} from "@sweet-star/services";
import type { CurrentShotScript } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("videos api", () => {
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
  });

  it("creates a videos generate task from approved images", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_videos_generate_1",
      },
    });
    const project = await createProject(app);

    await seedApprovedShotScript({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedImageBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/generate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_videos_generate_1",
        type: "videos_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_videos_generate_1",
      queueName: "videos-generate",
      taskType: "videos_generate",
    });
  });

  it("creates a final cut task when all current shot videos are approved", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_final_cut_generate_1",
      },
    });
    const project = await createProject(app);

    await seedApprovedFinalCutSourceBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/final-cut/generate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_final_cut_generate_1",
        type: "final_cut_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_final_cut_generate_1",
      queueName: "final-cut-generate",
      taskType: "final_cut_generate",
    });
  });

  it("returns the current final cut state", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedApprovedFinalCutSourceBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedFinalCutRecord({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/final-cut`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      currentFinalCut: expect.objectContaining({
        id: "final_cut_1",
        sourceVideoBatchId: "video_batch_1",
        status: "ready",
        videoAssetPath: "final-cut/current.mp4",
      }),
    });
  });

  it("lists the current video batch, loads one segment, and regenerates it independently", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_video_segment_regen_1",
      },
    });
    const project = await createProject(app);

    await seedVideoBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "videos_in_review",
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/videos`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "video_batch_1",
          shotCount: 1,
          approvedShotCount: 0,
        }),
        shots: expect.arrayContaining([
          expect.objectContaining({
            id: "video_segment_1",
            shotId: "shot_1",
            shotCode: "S01-SG01-SH01",
            segmentId: "segment_1",
            status: "in_review",
            promptTextCurrent: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
          }),
        ]),
      }),
    );

    const segmentResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/videos/segments/video_segment_1`,
    });

    expect(segmentResponse.statusCode).toBe(200);
    expect(segmentResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_1",
        model: "sora-2-all",
        provider: "vector-engine",
        promptTextCurrent: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
      }),
    );

    const savePromptResponse = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/videos/segments/video_segment_1/prompt`,
      payload: {
        promptTextCurrent: "用户改写后的当前视频提示词",
      },
    });

    expect(savePromptResponse.statusCode).toBe(200);
    expect(savePromptResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_1",
        promptTextCurrent: "用户改写后的当前视频提示词",
      }),
    );

    const regeneratePromptResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/segments/video_segment_1/regenerate-prompt`,
      payload: {},
    });

    expect(regeneratePromptResponse.statusCode).toBe(200);
    expect(regeneratePromptResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_1",
        promptTextCurrent: expect.stringContaining("林在雨夜市场边停下"),
      }),
    );

    const regenerateAllPromptsResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/regenerate-prompts`,
      payload: {},
    });

    expect(regenerateAllPromptsResponse.statusCode).toBe(200);
    expect(regenerateAllPromptsResponse.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "video_batch_1",
        }),
        shots: expect.arrayContaining([
          expect.objectContaining({
            id: "video_segment_1",
            promptTextCurrent: expect.stringContaining("林在雨夜市场边停下"),
          }),
        ]),
      }),
    );

    const regenerateResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/segments/video_segment_1/regenerate`,
      payload: {},
    });

    expect(regenerateResponse.statusCode).toBe(201);
    expect(regenerateResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_video_segment_regen_1",
        type: "segment_video_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_video_segment_regen_1",
      queueName: "segment-video-generate",
      taskType: "segment_video_generate",
    });
  });

  it("approves one segment and can approve all remaining segments into videos_approved", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedVideoBatch({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "videos_in_review",
    });

    const approveOneResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/segments/video_segment_1/approve`,
      payload: {},
    });

    expect(approveOneResponse.statusCode).toBe(200);
    expect(approveOneResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_1",
        status: "approved",
        approvedAt: expect.any(String),
      }),
    );

    const approveAllResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/approve-all`,
      payload: {},
    });

    expect(approveAllResponse.statusCode).toBe(200);
    expect(approveAllResponse.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          approvedShotCount: 1,
        }),
        shots: expect.arrayContaining([
          expect.objectContaining({
            id: "video_segment_1",
            status: "approved",
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
        status: "videos_approved",
      }),
    );
  });

  it("targets a duplicated shot-script segment by unique video id for load, regenerate, and approve", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_video_segment_regen_scene_2",
      },
    });
    const project = await createProject(app);

    await seedVideoBatchWithDuplicateSegmentIds({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      projectStatus: "videos_in_review",
    });

    const segmentResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/videos/segments/video_segment_scene_2`,
    });

    expect(segmentResponse.statusCode).toBe(200);
    expect(segmentResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_scene_2",
        sceneId: "scene_2",
        segmentId: "segment_1",
      }),
    );

    const regenerateResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/segments/video_segment_scene_2/regenerate`,
      payload: {},
    });

    expect(regenerateResponse.statusCode).toBe(201);
    expect(regenerateResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_video_segment_regen_scene_2",
        type: "segment_video_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_video_segment_regen_scene_2",
      queueName: "segment-video-generate",
      taskType: "segment_video_generate",
    });

    const approveResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/videos/segments/video_segment_scene_2/approve`,
      payload: {},
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toEqual(
      expect.objectContaining({
        id: "video_segment_scene_2",
        sceneId: "scene_2",
        status: "approved",
      }),
    );
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-videos-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: options?.taskQueue,
      taskIdGenerator: options?.taskIdGenerator,
      videoPromptProvider: {
        generateVideoPrompt: vi.fn().mockResolvedValue({
          finalPrompt:
            "以<<<image_1>>>为首帧锚点，林在雨夜市场边停下，抬头望向天际，保留雨声、风铃声和远处低鸣，镜头平稳推进，保持角色与环境连续。",
          dialoguePlan: "无明确台词，无旁白。",
          audioPlan: "雨声、风铃声、远处低鸣。",
          visualGuardrails: "保持雨夜市场、林的服装与空间方位连续。",
          rationale: "将动作、环境声和连续性收束成单镜头 Kling Omni 提示词。",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          rawResponse: "{}",
        }),
      },
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

async function seedApprovedImageBatch(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
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
  const shotReference = createShotReferenceRecord({
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
      imageStatus: "approved",
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
      approvedAt: "2026-03-24T13:03:00.000Z",
    },
    endFrame: {
      id: "frame_end_1",
      planStatus: "planned",
      imageStatus: "approved",
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
      approvedAt: "2026-03-24T13:03:00.000Z",
    },
  });

  shotImageRepository.insertBatch(batch);
  shotImageRepository.insertShot?.(shotReference);
  projectRepository.updateCurrentImageBatch({
    projectId: input.projectId,
    batchId: batch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "images_approved",
    updatedAt: "2026-03-24T13:05:00.000Z",
  });
  db.close();
}

async function seedVideoBatch(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  projectStatus: "videos_generating" | "videos_in_review" | "videos_approved";
}) {
  await seedApprovedShotScript(input);
  await seedApprovedImageBatch(input);

  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const videoRepository = createSqliteVideoRepository({ db });

  const batch = createVideoBatchRecord({
    id: "video_batch_1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: "image_batch_1",
    sourceShotScriptId: "shot_script_1",
    segmentCount: 1,
    createdAt: "2026-03-25T01:00:00.000Z",
    updatedAt: "2026-03-25T01:00:00.000Z",
  });
  const segment = createSegmentVideoRecord({
    id: "video_segment_1",
    batchId: batch.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: batch.sourceImageBatchId,
    sourceShotScriptId: batch.sourceShotScriptId,
    shotId: "shot_1",
    shotCode: "S01-SG01-SH01",
    segmentId: "segment_1",
    sceneId: "scene_1",
    segmentOrder: 1,
    segmentSummary: "林在雨夜市场边停下，抬头望向天际。",
    shotCount: 1,
    sourceShotIds: ["shot_1"],
    shotOrder: 1,
    frameDependency: "start_and_end_frame",
    status: "in_review",
    promptTextSeed: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
    promptTextCurrent: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
    promptUpdatedAt: "2026-03-25T01:04:00.000Z",
    videoAssetPath: "videos/batches/video_batch_1/shots/scene_1__segment_1__shot_1/current.mp4",
    thumbnailAssetPath: "videos/batches/video_batch_1/shots/scene_1__segment_1__shot_1/thumbnail.webp",
    durationSec: 6,
    provider: "vector-engine",
    model: "sora-2-all",
    updatedAt: "2026-03-25T01:05:00.000Z",
    sourceTaskId: "task_video_segment_1",
  });

  videoRepository.insertBatch(batch);
  videoRepository.insertSegment(segment);
  projectRepository.updateCurrentVideoBatch?.({
    projectId: input.projectId,
    batchId: batch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.projectStatus,
    updatedAt: "2026-03-25T01:06:00.000Z",
  });
  db.close();
}

async function seedApprovedFinalCutSourceBatch(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  await seedVideoBatch({
    ...input,
    projectStatus: "videos_approved",
  });

  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const videoRepository = createSqliteVideoRepository({ db });

  const approvedSegment = await videoRepository.findSegmentById("video_segment_1");

  if (!approvedSegment) {
    throw new Error("Expected seeded video segment to exist");
  }

  videoRepository.updateSegment({
    ...approvedSegment,
    status: "approved",
    approvedAt: "2026-03-25T01:07:00.000Z",
    updatedAt: "2026-03-25T01:07:00.000Z",
  });
  db.close();
}

async function seedFinalCutRecord(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const videoRepository = createSqliteVideoRepository({ db });

  videoRepository.upsertFinalCut?.({
    id: "final_cut_1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceVideoBatchId: "video_batch_1",
    status: "ready",
    videoAssetPath: "final-cut/current.mp4",
    manifestAssetPath: "final-cut/manifests/final_cut_1.txt",
    shotCount: 1,
    createdAt: "2026-03-31T00:00:00.000Z",
    updatedAt: "2026-03-31T00:01:00.000Z",
    errorMessage: null,
    storageDir: `${input.projectStorageDir}/final-cut`,
    currentVideoRelPath: "final-cut/current.mp4",
    currentMetadataRelPath: "final-cut/current.json",
    manifestStorageRelPath: "final-cut/manifests/final_cut_1.txt",
    versionsStorageDir: "final-cut/versions",
  });
  db.close();
}

async function seedVideoBatchWithDuplicateSegmentIds(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  projectStatus: "videos_generating" | "videos_in_review" | "videos_approved";
}) {
  await seedApprovedShotScript(input);
  await seedApprovedImageBatch(input);

  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const shotScriptStorage = createShotScriptStorage({ paths });
  const shotImageRepository = createSqliteShotImageRepository({ db });
  const videoRepository = createSqliteVideoRepository({ db });

  const duplicateShotScript: CurrentShotScript = {
    id: "shot_script_dup_1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard_1",
    sourceTaskId: "task_shot_script_dup_1",
    updatedAt: "2026-03-24T12:00:00.000Z",
    approvedAt: "2026-03-24T12:05:00.000Z",
    segmentCount: 2,
    shotCount: 2,
    totalDurationSec: 12,
    segments: [
      {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        name: "Scene 1",
        summary: "林站在雨夜市场边。",
        durationSec: 6,
        status: "approved",
        lastGeneratedAt: "2026-03-24T12:00:00.000Z",
        approvedAt: "2026-03-24T12:05:00.000Z",
        shots: [
          {
            id: "shot_scene_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            frameDependency: "start_and_end_frame",
            durationSec: 6,
            purpose: "建立第一场空间。",
            visual: "林站在雨夜市场边。",
            subject: "林",
            action: "林停下脚步望向前方。",
            dialogue: null,
            os: null,
            audio: "雨声。",
            transitionHint: null,
            continuityNotes: null,
          },
        ],
      },
      {
        segmentId: "segment_1",
        sceneId: "scene_2",
        order: 2,
        name: "Scene 2",
        summary: "林转向被水淹没的十字路口。",
        durationSec: 6,
        status: "approved",
        lastGeneratedAt: "2026-03-24T12:00:00.000Z",
        approvedAt: "2026-03-24T12:05:00.000Z",
        shots: [
          {
            id: "shot_scene_2",
            sceneId: "scene_2",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S02-SG01-SH01",
            frameDependency: "start_and_end_frame",
            durationSec: 6,
            purpose: "建立第二场空间。",
            visual: "林转向被水淹没的十字路口。",
            subject: "林",
            action: "林缓慢转身看向路口。",
            dialogue: null,
            os: null,
            audio: "水流声。",
            transitionHint: null,
            continuityNotes: null,
          },
        ],
      },
    ],
  };

  await shotScriptStorage.writeCurrentShotScript({
    storageDir: input.projectStorageDir,
    shotScript: duplicateShotScript,
  });
  projectRepository.updateCurrentShotScript({
    projectId: input.projectId,
    shotScriptId: duplicateShotScript.id,
  });

  const batch = createShotImageBatchRecord({
    id: "image_batch_dup_1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: duplicateShotScript.id,
    segmentCount: 2,
    createdAt: "2026-03-24T13:00:00.000Z",
    updatedAt: "2026-03-24T13:00:00.000Z",
  });
  const shotReferences = [
    createShotReferenceRecord({
      id: "shot_ref_scene_1",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_scene_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 6,
      frameDependency: "start_and_end_frame",
      updatedAt: "2026-03-24T13:00:00.000Z",
      startFrame: {
        id: "frame_start_scene_1",
        planStatus: "planned",
        imageStatus: "approved",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "scene_1 start",
        promptTextCurrent: "scene_1 start",
        negativePromptTextCurrent: null,
        imageAssetPath: "images/batches/image_batch_dup_1/shots/scene_1__segment_1__shot_scene_1/start-frame/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        updatedAt: "2026-03-24T13:00:00.000Z",
        approvedAt: "2026-03-24T13:03:00.000Z",
      },
      endFrame: {
        id: "frame_end_scene_1",
        planStatus: "planned",
        imageStatus: "approved",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "scene_1 end",
        promptTextCurrent: "scene_1 end",
        negativePromptTextCurrent: null,
        imageAssetPath: "images/batches/image_batch_dup_1/shots/scene_1__segment_1__shot_scene_1/end-frame/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        updatedAt: "2026-03-24T13:00:00.000Z",
        approvedAt: "2026-03-24T13:03:00.000Z",
      },
    }),
    createShotReferenceRecord({
      id: "shot_ref_scene_2",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      sceneId: "scene_2",
      segmentId: "segment_1",
      shotId: "shot_scene_2",
      shotCode: "S02-SG01-SH01",
      segmentOrder: 2,
      shotOrder: 1,
      durationSec: 6,
      frameDependency: "start_and_end_frame",
      updatedAt: "2026-03-24T13:00:00.000Z",
      startFrame: {
        id: "frame_start_scene_2",
        planStatus: "planned",
        imageStatus: "approved",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "scene_2 start",
        promptTextCurrent: "scene_2 start",
        negativePromptTextCurrent: null,
        imageAssetPath: "images/batches/image_batch_dup_1/shots/scene_2__segment_1__shot_scene_2/start-frame/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        updatedAt: "2026-03-24T13:00:00.000Z",
        approvedAt: "2026-03-24T13:03:00.000Z",
      },
      endFrame: {
        id: "frame_end_scene_2",
        planStatus: "planned",
        imageStatus: "approved",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "scene_2 end",
        promptTextCurrent: "scene_2 end",
        negativePromptTextCurrent: null,
        imageAssetPath: "images/batches/image_batch_dup_1/shots/scene_2__segment_1__shot_scene_2/end-frame/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        updatedAt: "2026-03-24T13:00:00.000Z",
        approvedAt: "2026-03-24T13:03:00.000Z",
      },
    }),
  ];

  shotImageRepository.insertBatch(batch);
  for (const shotReference of shotReferences) {
    shotImageRepository.insertShot?.(shotReference);
  }
  projectRepository.updateCurrentImageBatch({
    projectId: input.projectId,
    batchId: batch.id,
  });

  const videoBatch = createVideoBatchRecord({
    id: "video_batch_dup_1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: batch.id,
    sourceShotScriptId: duplicateShotScript.id,
    segmentCount: 2,
    createdAt: "2026-03-25T01:00:00.000Z",
    updatedAt: "2026-03-25T01:00:00.000Z",
  });
  const videoSegments = [
    createSegmentVideoRecord({
      id: "video_segment_scene_1",
      batchId: videoBatch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceImageBatchId: batch.id,
      sourceShotScriptId: duplicateShotScript.id,
      shotId: "shot_scene_1",
      shotCode: "S01-SG01-SH01",
      segmentId: "segment_1",
      sceneId: "scene_1",
      segmentOrder: 1,
      segmentSummary: "林站在雨夜市场边。",
      shotCount: 1,
      sourceShotIds: ["shot_scene_1"],
      shotOrder: 1,
      frameDependency: "start_and_end_frame",
      status: "in_review",
      promptTextSeed: "scene 1 video prompt",
      promptTextCurrent: "scene 1 video prompt",
      promptUpdatedAt: "2026-03-25T01:04:00.000Z",
      videoAssetPath: "videos/batches/video_batch_dup_1/shots/scene_1__segment_1__shot_scene_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_dup_1/shots/scene_1__segment_1__shot_scene_1/thumbnail.webp",
      durationSec: 6,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2026-03-25T01:05:00.000Z",
      sourceTaskId: "task_video_segment_scene_1",
    }),
    createSegmentVideoRecord({
      id: "video_segment_scene_2",
      batchId: videoBatch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceImageBatchId: batch.id,
      sourceShotScriptId: duplicateShotScript.id,
      shotId: "shot_scene_2",
      shotCode: "S02-SG01-SH01",
      segmentId: "segment_1",
      sceneId: "scene_2",
      segmentOrder: 2,
      segmentSummary: "林转向被水淹没的十字路口。",
      shotCount: 1,
      sourceShotIds: ["shot_scene_2"],
      shotOrder: 1,
      frameDependency: "start_and_end_frame",
      status: "in_review",
      promptTextSeed: "scene 2 video prompt",
      promptTextCurrent: "scene 2 video prompt",
      promptUpdatedAt: "2026-03-25T01:04:30.000Z",
      videoAssetPath: "videos/batches/video_batch_dup_1/shots/scene_2__segment_1__shot_scene_2/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_dup_1/shots/scene_2__segment_1__shot_scene_2/thumbnail.webp",
      durationSec: 6,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2026-03-25T01:06:00.000Z",
      sourceTaskId: "task_video_segment_scene_2",
    }),
  ];

  videoRepository.insertBatch(videoBatch);
  for (const segment of videoSegments) {
    videoRepository.insertSegment(segment);
  }
  projectRepository.updateCurrentVideoBatch?.({
    projectId: input.projectId,
    batchId: videoBatch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.projectStatus,
    updatedAt: "2026-03-25T01:06:00.000Z",
  });
  db.close();
}
