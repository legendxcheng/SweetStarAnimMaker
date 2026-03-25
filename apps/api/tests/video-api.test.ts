import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createSegmentFrameRecord,
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
          segmentCount: 1,
          approvedSegmentCount: 0,
        }),
        segments: expect.arrayContaining([
          expect.objectContaining({
            id: "video_segment_1",
            segmentId: "segment_1",
            status: "in_review",
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
          approvedSegmentCount: 1,
        }),
        segments: expect.arrayContaining([
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
  const startFrame = createSegmentFrameRecord({
    id: "frame_start_1",
    batchId: batch.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: "shot_script_1",
    segmentId: "segment_1",
    sceneId: "scene_1",
    order: 1,
    frameType: "start_frame",
    planStatus: "planned",
    imageStatus: "approved",
    selectedCharacterIds: ["char_rin_1"],
    matchedReferenceImagePaths: ["character-sheets/characters/char_rin_1/current.png"],
    unmatchedCharacterIds: [],
    promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
    promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
    negativePromptTextCurrent: null,
    imageAssetPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.png",
    imageWidth: 1536,
    imageHeight: 1024,
    provider: "turnaround-image",
    model: "doubao-seedream-5-0-260128",
    updatedAt: "2026-03-24T13:00:00.000Z",
    approvedAt: "2026-03-24T13:03:00.000Z",
  });
  const endFrame = createSegmentFrameRecord({
    id: "frame_end_1",
    batchId: batch.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: "shot_script_1",
    segmentId: "segment_1",
    sceneId: "scene_1",
    order: 1,
    frameType: "end_frame",
    planStatus: "planned",
    imageStatus: "approved",
    selectedCharacterIds: ["char_rin_1"],
    matchedReferenceImagePaths: ["character-sheets/characters/char_rin_1/current.png"],
    unmatchedCharacterIds: [],
    promptTextSeed: "尾帧定格在林与天际冷白尾光的对视。",
    promptTextCurrent: "尾帧定格在林与天际冷白尾光的对视。",
    negativePromptTextCurrent: null,
    imageAssetPath: "images/batches/image_batch_1/segments/segment_1/end-frame/current.png",
    imageWidth: 1536,
    imageHeight: 1024,
    provider: "turnaround-image",
    model: "doubao-seedream-5-0-260128",
    updatedAt: "2026-03-24T13:00:00.000Z",
    approvedAt: "2026-03-24T13:03:00.000Z",
  });

  shotImageRepository.insertBatch(batch);
  shotImageRepository.insertFrame(startFrame);
  shotImageRepository.insertFrame(endFrame);
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
    segmentId: "segment_1",
    sceneId: "scene_1",
    order: 1,
    status: "in_review",
    videoAssetPath: "videos/batches/video_batch_1/segments/segment_1/current.mp4",
    thumbnailAssetPath: "videos/batches/video_batch_1/segments/segment_1/thumbnail.webp",
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
        shots: [],
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
        shots: [],
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
  const frames = [
    createSegmentFrameRecord({
      id: "frame_start_scene_1",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame",
      planStatus: "planned",
      imageStatus: "approved",
      selectedCharacterIds: [],
      matchedReferenceImagePaths: [],
      unmatchedCharacterIds: [],
      promptTextSeed: "scene_1 start",
      promptTextCurrent: "scene_1 start",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_dup_1/segments/scene_1__segment_1/start-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
      approvedAt: "2026-03-24T13:03:00.000Z",
    }),
    createSegmentFrameRecord({
      id: "frame_end_scene_1",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "end_frame",
      planStatus: "planned",
      imageStatus: "approved",
      selectedCharacterIds: [],
      matchedReferenceImagePaths: [],
      unmatchedCharacterIds: [],
      promptTextSeed: "scene_1 end",
      promptTextCurrent: "scene_1 end",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_dup_1/segments/scene_1__segment_1/end-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
      approvedAt: "2026-03-24T13:03:00.000Z",
    }),
    createSegmentFrameRecord({
      id: "frame_start_scene_2",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      segmentId: "segment_1",
      sceneId: "scene_2",
      order: 2,
      frameType: "start_frame",
      planStatus: "planned",
      imageStatus: "approved",
      selectedCharacterIds: [],
      matchedReferenceImagePaths: [],
      unmatchedCharacterIds: [],
      promptTextSeed: "scene_2 start",
      promptTextCurrent: "scene_2 start",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_dup_1/segments/scene_2__segment_1/start-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
      approvedAt: "2026-03-24T13:03:00.000Z",
    }),
    createSegmentFrameRecord({
      id: "frame_end_scene_2",
      batchId: batch.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceShotScriptId: duplicateShotScript.id,
      segmentId: "segment_1",
      sceneId: "scene_2",
      order: 2,
      frameType: "end_frame",
      planStatus: "planned",
      imageStatus: "approved",
      selectedCharacterIds: [],
      matchedReferenceImagePaths: [],
      unmatchedCharacterIds: [],
      promptTextSeed: "scene_2 end",
      promptTextCurrent: "scene_2 end",
      negativePromptTextCurrent: null,
      imageAssetPath: "images/batches/image_batch_dup_1/segments/scene_2__segment_1/end-frame/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T13:00:00.000Z",
      approvedAt: "2026-03-24T13:03:00.000Z",
    }),
  ];

  shotImageRepository.insertBatch(batch);
  for (const frame of frames) {
    shotImageRepository.insertFrame(frame);
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
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "in_review",
      videoAssetPath: "videos/batches/video_batch_dup_1/segments/scene_1__segment_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_dup_1/segments/scene_1__segment_1/thumbnail.webp",
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
      segmentId: "segment_1",
      sceneId: "scene_2",
      order: 2,
      status: "in_review",
      videoAssetPath: "videos/batches/video_batch_dup_1/segments/scene_2__segment_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_dup_1/segments/scene_2__segment_1/thumbnail.webp",
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
