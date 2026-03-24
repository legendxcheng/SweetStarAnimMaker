import { describe, expect, it, vi } from "vitest";

import { createApproveImageFrameUseCase } from "../src/index";

describe("approve image frame use case", () => {
  it("approves only the selected frame when sibling frames are still pending review", async () => {
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_segment_1_start",
          imageStatus: "approved",
        },
        {
          id: "frame_segment_1_end",
          imageStatus: "in_review",
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_segment_1_start",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "planned",
        imageStatus: "in_review",
        selectedCharacterIds: ["char_rin"],
        matchedReferenceImagePaths: ["E:/refs/char_rin.png"],
        unmatchedCharacterIds: [],
        promptTextSeed: "原始规划 Prompt",
        promptTextCurrent: "新的用户 Prompt",
        negativePromptTextCurrent: null,
        promptUpdatedAt: "2026-03-24T00:19:00.000Z",
        imageAssetPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "vector-engine",
        model: "doubao-seedream-5-0-260128",
        approvedAt: null,
        updatedAt: "2026-03-24T00:19:00.000Z",
        sourceTaskId: "task_frame_image_1",
        storageDir: "ignored",
        planningRelPath: "ignored",
        promptSeedRelPath: "ignored",
        promptCurrentRelPath: "ignored",
        currentImageRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        promptVersionsStorageDir: "ignored",
        versionsStorageDir: "ignored",
      }),
      updateFrame: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_in_review",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:19:00.000Z",
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

    const useCase = createApproveImageFrameUseCase({
      projectRepository,
      shotImageRepository,
      clock: { now: () => "2026-03-24T00:20:00.000Z" },
    });

    await useCase.execute({
      projectId: "proj_1",
      frameId: "frame_segment_1_start",
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_segment_1_start",
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:20:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "images_approved" }),
    );
  });

  it("marks the project as images_approved when the final frame is approved", async () => {
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_segment_1_start",
          imageStatus: "approved",
        },
        {
          id: "frame_segment_1_end",
          imageStatus: "approved",
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_segment_1_end",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "end_frame",
        planStatus: "planned",
        imageStatus: "in_review",
        selectedCharacterIds: ["char_rin"],
        matchedReferenceImagePaths: ["E:/refs/char_rin.png"],
        unmatchedCharacterIds: [],
        promptTextSeed: "原始规划 Prompt",
        promptTextCurrent: "新的用户 Prompt",
        negativePromptTextCurrent: null,
        promptUpdatedAt: "2026-03-24T00:19:00.000Z",
        imageAssetPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "vector-engine",
        model: "doubao-seedream-5-0-260128",
        approvedAt: null,
        updatedAt: "2026-03-24T00:19:00.000Z",
        sourceTaskId: "task_frame_image_2",
        storageDir: "ignored",
        planningRelPath: "ignored",
        promptSeedRelPath: "ignored",
        promptCurrentRelPath: "ignored",
        currentImageRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        promptVersionsStorageDir: "ignored",
        versionsStorageDir: "ignored",
      }),
      updateFrame: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_in_review",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:19:00.000Z",
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

    const useCase = createApproveImageFrameUseCase({
      projectRepository,
      shotImageRepository,
      clock: { now: () => "2026-03-24T00:21:00.000Z" },
    });

    await useCase.execute({
      projectId: "proj_1",
      frameId: "frame_segment_1_end",
    });

    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_approved",
      updatedAt: "2026-03-24T00:21:00.000Z",
    });
  });
});
