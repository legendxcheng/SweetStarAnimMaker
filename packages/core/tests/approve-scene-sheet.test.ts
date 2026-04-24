import { describe, expect, it, vi } from "vitest";

import { createApproveSceneSheetUseCase } from "../src/index";

describe("approve scene sheet use case", () => {
  it("approves the scene and moves the project to scene_sheets_approved when all are approved", async () => {
    const sceneSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listScenesByBatchId: vi.fn().mockResolvedValue([
        { id: "scene_rain_dock", status: "approved" },
        { id: "scene_clinic_corridor", status: "approved" },
      ]),
      insertScene: vi.fn(),
      findSceneById: vi.fn().mockResolvedValue({
        id: "scene_rain_dock",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "scene_batch_v1",
        sourceMasterPlotId: "mp_1",
        sourceCharacterSheetBatchId: "char_batch_v1",
        sceneName: "暴雨码头",
        scenePurpose: "故事开场的核心外部环境。",
        promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
        promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
        constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
        imageAssetPath: "current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "scene-v1",
        status: "in_review",
        updatedAt: "2026-04-22T00:09:00.000Z",
        approvedAt: null,
        sourceTaskId: "task_scene_rain_dock",
        storageDir: "ignored",
        currentImageRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        promptGeneratedRelPath: "ignored",
        promptCurrentRelPath: "ignored",
        promptVariablesRelPath: "ignored",
        imagePromptRelPath: "ignored",
        versionsStorageDir: "ignored",
      }),
      updateScene: vi.fn(),
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
        currentMasterPlotId: "mp_1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentSceneSheetBatchId: "scene_batch_v1",
        currentStoryboardId: null,
        currentShotScriptId: null,
        currentImageBatchId: null,
        currentVideoBatchId: null,
        status: "scene_sheets_in_review",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        premiseUpdatedAt: "2026-04-22T00:00:00.000Z",
        visualStyleText: "冷色电影感",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentSceneSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const useCase = createApproveSceneSheetUseCase({
      projectRepository,
      sceneSheetRepository,
      clock: { now: () => "2026-04-22T00:12:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1", sceneId: "scene_rain_dock" });

    expect(sceneSheetRepository.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "scene_rain_dock",
        status: "approved",
        approvedAt: "2026-04-22T00:12:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "scene_sheets_approved",
      updatedAt: "2026-04-22T00:12:00.000Z",
    });
    expect(result.status).toBe("approved");
  });
});
