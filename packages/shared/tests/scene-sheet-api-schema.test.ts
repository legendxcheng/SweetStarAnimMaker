import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("scene sheet api schema", () => {
  it("accepts a current scene-sheet batch summary", () => {
    const parsed = shared.currentSceneSheetBatchSummaryResponseSchema.parse({
      id: "scene_batch_v1",
      sourceMasterPlotId: "master_plot_v1",
      sourceCharacterSheetBatchId: "char_batch_v1",
      sceneCount: 3,
      approvedSceneCount: 2,
      updatedAt: "2026-04-21T10:00:00.000Z",
    });

    expect(parsed.sceneCount).toBe(3);
    expect(parsed.approvedSceneCount).toBe(2);
  });

  it("accepts a scene-sheet detail response", () => {
    const parsed = shared.sceneSheetDetailResponseSchema.parse({
      id: "scene_sheet_1",
      projectId: "proj_1",
      batchId: "scene_batch_v1",
      sourceMasterPlotId: "master_plot_v1",
      sourceCharacterSheetBatchId: "char_batch_v1",
      sceneName: "女主出租屋卧室",
      scenePurpose: "女主的日常生活空间，也是情绪低谷场景。",
      promptTextGenerated: "旧式出租屋卧室，生活痕迹明显，夜晚冷色灯光。",
      promptTextCurrent: "旧式出租屋卧室，生活痕迹明显，夜晚冷色灯光。",
      constraintsText: "保持狭小卧室结构、旧书桌、窄床、夜晚冷色氛围不变。",
      imageAssetPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_sheet_1/current.png",
      imageWidth: 1280,
      imageHeight: 720,
      provider: "vectorengine",
      model: "seedream-4",
      status: "in_review",
      updatedAt: "2026-04-21T10:05:00.000Z",
      approvedAt: null,
      sourceTaskId: "task_scene_sheet_1",
    });

    expect(parsed.sceneName).toContain("卧室");
    expect(parsed.status).toBe("in_review");
  });

  it("accepts a scene-sheet list response", () => {
    const parsed = shared.sceneSheetListResponseSchema.parse({
      currentBatch: {
        id: "scene_batch_v1",
        sourceMasterPlotId: "master_plot_v1",
        sourceCharacterSheetBatchId: "char_batch_v1",
        sceneCount: 3,
        approvedSceneCount: 1,
        updatedAt: "2026-04-21T10:00:00.000Z",
      },
      scenes: [
        {
          id: "scene_sheet_1",
          projectId: "proj_1",
          batchId: "scene_batch_v1",
          sourceMasterPlotId: "master_plot_v1",
          sourceCharacterSheetBatchId: "char_batch_v1",
          sceneName: "医院走廊",
          scenePurpose: "重要冲突和揭示场景。",
          promptTextGenerated: "现代医院走廊，白色顶灯，深夜空旷。",
          promptTextCurrent: "现代医院走廊，白色顶灯，深夜空旷。",
          constraintsText: "保持医院走廊白墙、蓝灰色地面、顶灯和夜晚空旷感。",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "generating",
          updatedAt: "2026-04-21T10:05:00.000Z",
          approvedAt: null,
          sourceTaskId: "task_scene_sheet_1",
        },
      ],
    });

    expect(parsed.currentBatch.sceneCount).toBe(3);
    expect(parsed.scenes).toHaveLength(1);
  });

  it("accepts a scene-sheet prompt update request", () => {
    const parsed = shared.updateSceneSheetPromptRequestSchema.parse({
      promptTextCurrent: "现代医院走廊，白色顶灯，深夜空旷，画面克制。",
    });

    expect(parsed.promptTextCurrent).toContain("医院走廊");
  });

  it("accepts empty scene-sheet regenerate and approve requests", () => {
    expect(shared.regenerateSceneSheetRequestSchema.parse({})).toEqual({});
    expect(shared.approveSceneSheetRequestSchema.parse({})).toEqual({});
  });
});
