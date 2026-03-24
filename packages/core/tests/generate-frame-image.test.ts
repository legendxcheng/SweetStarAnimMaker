import { describe, expect, it, vi } from "vitest";

import { createGenerateFrameImageUseCase } from "../src/index";

describe("generate frame image use case", () => {
  it("marks the frame and project as generating before enqueuing the task", async () => {
    const frame = {
      id: "frame_start_1",
      batchId: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame" as const,
      planStatus: "planned" as const,
      imageStatus: "pending" as const,
      selectedCharacterIds: ["char_rin_1"],
      matchedReferenceImagePaths: ["character-sheets/batches/char_batch_1/characters/char_rin_1/current.png"],
      unmatchedCharacterIds: [],
      promptTextSeed: "原始规划 Prompt",
      promptTextCurrent: "用户编辑后的 Prompt",
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
      storageDir:
        "projects/proj_1-my-story/images/batches/image_batch_1/segments/scene_1__segment_1/start-frame",
      planningRelPath:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/planning.json",
      promptSeedRelPath:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.seed.txt",
      promptCurrentRelPath:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.current.txt",
      currentImageRelPath:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/current.png",
      currentMetadataRelPath:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/current.json",
      promptVersionsStorageDir:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/prompt.versions",
      versionsStorageDir:
        "images/batches/image_batch_1/segments/scene_1__segment_1/start-frame/versions",
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
    const taskQueue = { enqueue: vi.fn() };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_1",
        currentCharacterSheetBatchId: "char_batch_1",
        currentStoryboardId: "storyboard_1",
        currentShotScriptId: "shot_script_1",
        currentImageBatchId: "image_batch_1",
        status: "images_in_review",
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
        premiseUpdatedAt: "2026-03-24T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };

    const useCase = createGenerateFrameImageUseCase({
      projectRepository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: { generateTaskId: vi.fn().mockReturnValue("task_frame_image_1") },
      clock: { now: vi.fn().mockReturnValue("2026-03-24T10:30:00.000Z") },
    });

    await useCase.execute({
      projectId: "proj_1",
      frameId: "frame_start_1",
    });

    expect(taskFileStorage.appendTaskLog).toHaveBeenNthCalledWith(1, {
      task: expect.objectContaining({ id: "task_frame_image_1" }),
      message: "frame image task created for frame frame_start_1",
    });
    expect(taskFileStorage.appendTaskLog).toHaveBeenNthCalledWith(2, {
      task: expect.objectContaining({ id: "task_frame_image_1" }),
      message: "frame image task queued for frame frame_start_1",
    });
    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_start_1",
        imageStatus: "generating",
        approvedAt: null,
        updatedAt: "2026-03-24T10:30:00.000Z",
        sourceTaskId: "task_frame_image_1",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_generating",
      updatedAt: "2026-03-24T10:30:00.000Z",
    });
  });
});
