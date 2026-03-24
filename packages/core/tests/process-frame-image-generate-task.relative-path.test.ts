import { describe, expect, it, vi } from "vitest";

import { createProcessFrameImageGenerateTaskUseCase } from "../src/index";

describe("process frame image generate task use case relative paths", () => {
  it("resolves project-relative matched reference image paths before calling the provider", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_frame_image_1",
        projectId: "proj_20260324_ab12cd",
        type: "frame_image_generate",
        status: "pending",
        queueName: "frame-image-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_frame_image_1",
        inputRelPath: "tasks/task_frame_image_1/input.json",
        outputRelPath: "tasks/task_frame_image_1/output.json",
        logRelPath: "tasks/task_frame_image_1/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:16:00.000Z",
        updatedAt: "2026-03-24T00:16:00.000Z",
        startedAt: null,
        finishedAt: null,
      }),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:16:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
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
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_frame_image_1",
        projectId: "proj_20260324_ab12cd",
        taskType: "frame_image_generate",
        batchId: "image_batch_task_20260324_images",
        frameId: "frame_segment_1_start",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_segment_1_start",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "planned",
        imageStatus: "pending",
        selectedCharacterIds: ["char_rin"],
        matchedReferenceImagePaths: [
          "character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
        ],
        unmatchedCharacterIds: [],
        promptTextSeed: "原始规划 Prompt",
        promptTextCurrent: "用户编辑后的 Prompt",
        negativePromptTextCurrent: "模糊，低清晰度",
        promptUpdatedAt: "2026-03-24T00:15:00.000Z",
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-24T00:15:00.000Z",
        sourceTaskId: "task_frame_prompt_1",
        storageDir:
          "projects/proj_20260324_ab12cd-my-story/images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame",
        planningRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/planning.json",
        promptSeedRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.seed.txt",
        promptCurrentRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.current.txt",
        currentImageRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.png",
        currentMetadataRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.json",
        promptVersionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.versions",
        versionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/versions",
      }),
      updateFrame: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi
        .fn()
        .mockReturnValue(
          "E:/SweetStarAnimMaker/.local-data/projects/proj_20260324_ab12cd-my-story/character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
        ),
    };
    const shotImageProvider = {
      generateShotImage: vi.fn().mockResolvedValue({
        imageBytes: new Uint8Array([1, 2, 3]),
        rawResponse: '{"ok":true}',
        provider: "vector-engine",
        model: "doubao-seedream-5-0-260128",
        width: 1024,
        height: 1024,
      }),
    };

    const useCase = createProcessFrameImageGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotImageProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:17:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:18:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_frame_image_1" });

    expect(shotImageStorage.resolveProjectAssetPath).toHaveBeenCalledWith({
      projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
      assetRelPath: "character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
    });
    expect(shotImageProvider.generateShotImage).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceImagePaths: [
          "E:/SweetStarAnimMaker/.local-data/projects/proj_20260324_ab12cd-my-story/character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
        ],
      }),
    );
  });
});
