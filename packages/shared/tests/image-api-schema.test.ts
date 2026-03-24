import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("image api schema", () => {
  it("exposes frame-level image task types", () => {
    expect(shared.taskTypes).toEqual([
      "master_plot_generate",
      "character_sheets_generate",
      "character_sheet_generate",
      "storyboard_generate",
      "shot_script_generate",
      "shot_script_segment_generate",
      "images_generate",
      "frame_prompt_generate",
      "frame_image_generate",
    ]);
  });

  it("accepts a current image batch summary payload", () => {
    const parsed = shared.currentImageBatchSummaryResponseSchema.parse({
      id: "image_batch_20260323_ab12cd",
      sourceShotScriptId: "shot_script_20260323_ab12cd",
      segmentCount: 2,
      totalFrameCount: 4,
      approvedFrameCount: 1,
      updatedAt: "2026-03-23T12:00:00.000Z",
    });

    expect(parsed.totalFrameCount).toBe(4);
    expect(parsed.approvedFrameCount).toBe(1);
  });

  it("accepts a frame detail payload with prompt and reference-image fields", () => {
    const parsed = shared.imageFrameResponseSchema.parse({
      id: "frame_20260323_start_1",
      batchId: "image_batch_20260323_ab12cd",
      projectId: "proj_20260323_ab12cd",
      sourceShotScriptId: "shot_script_20260323_ab12cd",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame",
      planStatus: "planned",
      imageStatus: "in_review",
      selectedCharacterIds: ["char_rin", "char_ivo"],
      matchedReferenceImagePaths: [
        ".local-data/projects/proj_20260323_ab12cd/images/characters/char_rin.png",
      ],
      unmatchedCharacterIds: ["char_ivo"],
      promptTextSeed: "清晨积水集市入口，林夏回头确认退路已经被封住。",
      promptTextCurrent: "清晨积水集市入口，林夏回头确认退路已经被封住，电影感构图。",
      negativePromptTextCurrent: "模糊，低清晰度，多余手指",
      promptUpdatedAt: "2026-03-23T12:05:00.000Z",
      imageAssetPath: ".local-data/projects/proj_20260323_ab12cd/images/current.png",
      imageWidth: 1024,
      imageHeight: 1024,
      provider: "vector-engine",
      model: "doubao-seedream-5-0-260128",
      approvedAt: null,
      updatedAt: "2026-03-23T12:06:00.000Z",
      sourceTaskId: "task_20260323_frame_image",
    });

    expect(parsed.frameType).toBe("start_frame");
    expect(parsed.matchedReferenceImagePaths).toHaveLength(1);
    expect(parsed.unmatchedCharacterIds).toEqual(["char_ivo"]);
  });

  it("accepts a list-images response with flat frame records", () => {
    const parsed = shared.imageFrameListResponseSchema.parse({
      currentBatch: {
        id: "image_batch_20260323_ab12cd",
        sourceShotScriptId: "shot_script_20260323_ab12cd",
        segmentCount: 2,
        totalFrameCount: 4,
        approvedFrameCount: 1,
        updatedAt: "2026-03-23T12:00:00.000Z",
      },
      frames: [
        {
          id: "frame_20260323_start_1",
          batchId: "image_batch_20260323_ab12cd",
          projectId: "proj_20260323_ab12cd",
          sourceShotScriptId: "shot_script_20260323_ab12cd",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "start_frame",
          planStatus: "planned",
          imageStatus: "approved",
          selectedCharacterIds: ["char_rin"],
          matchedReferenceImagePaths: [],
          unmatchedCharacterIds: [],
          promptTextSeed: "清晨积水集市入口。",
          promptTextCurrent: "清晨积水集市入口。",
          negativePromptTextCurrent: null,
          promptUpdatedAt: null,
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          approvedAt: "2026-03-23T12:10:00.000Z",
          updatedAt: "2026-03-23T12:10:00.000Z",
          sourceTaskId: null,
        },
      ],
    });

    expect(parsed.frames[0]?.imageStatus).toBe("approved");
  });

  it("accepts a batch regenerate-prompts response", () => {
    const parsed = shared.regenerateAllImagePromptsResponseSchema.parse({
      batchId: "image_batch_20260324_ab12cd",
      frameCount: 4,
      taskIds: ["task_1", "task_2", "task_3", "task_4"],
    });

    expect(parsed.frameCount).toBe(4);
    expect(parsed.taskIds).toHaveLength(4);
  });

  it("accepts an update-frame-prompt request with nullable negative prompt", () => {
    const parsed = shared.updateImageFramePromptRequestSchema.parse({
      promptTextCurrent: "清晨积水集市入口，林夏回头确认退路已经被封住。",
      negativePromptTextCurrent: null,
    });

    expect(parsed.negativePromptTextCurrent).toBeNull();
  });
});
