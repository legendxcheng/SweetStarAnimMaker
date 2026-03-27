import { describe, expect, it, vi } from "vitest";

import {
  createShotReferenceRecord,
  createUpdateFramePromptUseCase,
} from "../src/index";

describe("update frame prompt use case", () => {
  it("updates only the editable current and negative prompts", async () => {
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
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
        promptTextCurrent: "旧 Prompt",
        negativePromptTextCurrent: "旧负向 Prompt",
        promptUpdatedAt: "2026-03-24T00:18:00.000Z",
        imageAssetPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "vector-engine",
        model: "doubao-seedream-5-0-260128",
        approvedAt: null,
        updatedAt: "2026-03-24T00:18:00.000Z",
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
    const useCase = createUpdateFramePromptUseCase({
      projectRepository: {
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
          updatedAt: "2026-03-24T00:18:00.000Z",
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
      },
      shotImageRepository,
      clock: { now: () => "2026-03-24T00:19:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      frameId: "frame_segment_1_start",
      promptTextCurrent: "新的用户 Prompt",
      negativePromptTextCurrent: null,
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTextSeed: "原始规划 Prompt",
        promptTextCurrent: "新的用户 Prompt",
        negativePromptTextCurrent: null,
        promptUpdatedAt: "2026-03-24T00:19:00.000Z",
      }),
    );
    expect(result.promptTextCurrent).toBe("新的用户 Prompt");
    expect(result.promptTextSeed).toBe("原始规划 Prompt");
  });

  it("updates the owning shot slot when the current batch is stored shot-first", async () => {
    const shot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T00:18:00.000Z",
      startFrame: {
        planStatus: "planned",
        imageStatus: "in_review",
        promptTextSeed: "原始规划 Prompt",
        promptTextCurrent: "旧 Prompt",
        negativePromptTextCurrent: "旧负向 Prompt",
        promptUpdatedAt: "2026-03-24T00:18:00.000Z",
        imageAssetPath: "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "vector-engine",
        model: "doubao-seedream-5-0-260128",
        sourceTaskId: "task_frame_image_1",
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
    const useCase = createUpdateFramePromptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          storageDir: "projects/proj_1-my-story",
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
      clock: { now: () => "2026-03-24T00:19:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      frameId: shot.startFrame.id,
      promptTextCurrent: "新的用户 Prompt",
      negativePromptTextCurrent: null,
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: shot.startFrame.id,
        promptTextCurrent: "新的用户 Prompt",
        negativePromptTextCurrent: null,
        promptUpdatedAt: "2026-03-24T00:19:00.000Z",
      }),
    );
    expect(shotImageRepository.updateShot).not.toHaveBeenCalled();
    expect(result.promptTextCurrent).toBe("新的用户 Prompt");
  });
});
