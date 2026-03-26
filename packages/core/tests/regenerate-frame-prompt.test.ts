import { describe, expect, it, vi } from "vitest";

import {
  createRegenerateFramePromptUseCase,
  createShotReferenceRecord,
} from "../src/index";

describe("regenerate frame prompt use case", () => {
  it("marks the frame prompt status as pending before enqueuing the task", async () => {
    const frame = {
      id: "frame_start_1",
      batchId: "image_batch_1",
      projectId: "proj_20260324_ab12cd",
      projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame" as const,
      planStatus: "planned" as const,
      imageStatus: "in_review" as const,
      selectedCharacterIds: [],
      matchedReferenceImagePaths: [],
      unmatchedCharacterIds: [],
      promptTextSeed: "旧提示词",
      promptTextCurrent: "旧提示词",
      negativePromptTextCurrent: null,
      promptUpdatedAt: "2026-03-24T10:00:00.000Z",
      imageAssetPath: null,
      imageWidth: null,
      imageHeight: null,
      provider: null,
      model: null,
      approvedAt: null,
      updatedAt: "2026-03-24T10:00:00.000Z",
      sourceTaskId: null,
      storageDir: "projects/proj_20260324_ab12cd-my-story/images/batches/image_batch_1/segments/scene_1__segment_1/start-frame",
      planningRelPath: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/planning.json",
      promptSeedRelPath: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.seed.txt",
      promptCurrentRelPath: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.current.txt",
      currentImageRelPath: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/current.png",
      currentMetadataRelPath: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/current.json",
      promptVersionsStorageDir: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.versions",
      versionsStorageDir: "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/versions",
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue(frame),
      updateFrame: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };

    const useCase = createRegenerateFramePromptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260324_ab12cd",
          storageDir: "projects/proj_20260324_ab12cd-my-story",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn().mockReturnValue("task_frame_prompt_1") },
      clock: { now: vi.fn().mockReturnValue("2026-03-24T10:30:00.000Z") },
    });

    await useCase.execute({
      projectId: "proj_20260324_ab12cd",
      frameId: "frame_start_1",
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_start_1",
        planStatus: "pending",
        updatedAt: "2026-03-24T10:30:00.000Z",
      }),
    );
  });

  it("updates the owning shot when the current batch is stored as shot records", async () => {
    const shot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: "image_batch_1",
      projectId: "proj_20260324_ab12cd",
      projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T10:00:00.000Z",
      startFrame: {
        planStatus: "planned",
        imageStatus: "in_review",
      },
    });
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([shot]),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue(null),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };

    const useCase = createRegenerateFramePromptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260324_ab12cd",
          storageDir: "projects/proj_20260324_ab12cd-my-story",
          currentImageBatchId: "image_batch_1",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn().mockReturnValue("task_frame_prompt_2") },
      clock: { now: vi.fn().mockReturnValue("2026-03-24T10:30:00.000Z") },
    });

    await useCase.execute({
      projectId: "proj_20260324_ab12cd",
      frameId: shot.startFrame.id,
    });

    expect(shotImageRepository.updateShot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: shot.id,
        startFrame: expect.objectContaining({
          id: shot.startFrame.id,
          planStatus: "pending",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          shotId: "shot_1",
          frameId: shot.startFrame.id,
        }),
      }),
    );
  });
});
