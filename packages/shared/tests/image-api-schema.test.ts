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
      "videos_generate",
      "segment_video_prompt_generate",
      "segment_video_generate",
    ]);
  });

  it("accepts a current image batch summary payload", () => {
    const parsed = shared.currentImageBatchSummaryResponseSchema.parse({
      id: "image_batch_20260323_ab12cd",
      sourceShotScriptId: "shot_script_20260323_ab12cd",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      approvedShotCount: 1,
      updatedAt: "2026-03-23T12:00:00.000Z",
    });

    expect(parsed.shotCount).toBe(2);
    expect(parsed.totalRequiredFrameCount).toBe(3);
    expect(parsed.approvedShotCount).toBe(1);
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

  it("accepts a list-images response with shot reference records", () => {
    const parsed = shared.imageFrameListResponseSchema.parse({
      currentBatch: {
        id: "image_batch_20260323_ab12cd",
        sourceShotScriptId: "shot_script_20260323_ab12cd",
        shotCount: 2,
        totalRequiredFrameCount: 3,
        approvedShotCount: 1,
        updatedAt: "2026-03-23T12:00:00.000Z",
      },
      shots: [
        {
          id: "shot_ref_20260323_1",
          batchId: "image_batch_20260323_ab12cd",
          projectId: "proj_20260323_ab12cd",
          sourceShotScriptId: "shot_script_20260323_ab12cd",
          shotId: "shot_script_20260323_ab12cd_SC01",
          shotCode: "SC01-SG01-SH01",
          frameDependency: "start_frame_only",
          referenceStatus: "approved",
          startFrame: {
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
          endFrame: null,
          updatedAt: "2026-03-23T12:10:00.000Z",
        },
        {
          id: "shot_ref_20260323_2",
          batchId: "image_batch_20260323_ab12cd",
          projectId: "proj_20260323_ab12cd",
          sourceShotScriptId: "shot_script_20260323_ab12cd",
          shotId: "shot_script_20260323_ab12cd_SC01-SH02",
          shotCode: "SC01-SG01-SH02",
          frameDependency: "start_and_end_frame",
          referenceStatus: "in_review",
          startFrame: {
            id: "frame_20260323_start_2",
            batchId: "image_batch_20260323_ab12cd",
            projectId: "proj_20260323_ab12cd",
            sourceShotScriptId: "shot_script_20260323_ab12cd",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 2,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "in_review",
            selectedCharacterIds: ["char_rin"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "黄昏的巷子。",
            promptTextCurrent: "黄昏的巷子，光线霓虹。",
            negativePromptTextCurrent: "模糊",
            promptUpdatedAt: "2026-03-23T12:15:00.000Z",
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-23T12:16:00.000Z",
            sourceTaskId: null,
          },
          endFrame: {
            id: "frame_20260323_end_2",
            batchId: "image_batch_20260323_ab12cd",
            projectId: "proj_20260323_ab12cd",
            sourceShotScriptId: "shot_script_20260323_ab12cd",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 2,
            frameType: "end_frame",
            planStatus: "planned",
            imageStatus: "pending",
            selectedCharacterIds: ["char_rin"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "黄昏的巷子。2",
            promptTextCurrent: "黄昏的巷子，光线霓虹。2",
            negativePromptTextCurrent: "模糊",
            promptUpdatedAt: null,
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-23T12:18:00.000Z",
            sourceTaskId: null,
          },
          updatedAt: "2026-03-23T12:20:00.000Z",
        },
      ],
    });

    expect(parsed.shots[0]?.startFrame.imageStatus).toBe("approved");
    expect(parsed.currentBatch.shotCount).toBe(2);
    expect(parsed.currentBatch.totalRequiredFrameCount).toBe(3);
    expect(parsed.currentBatch.approvedShotCount).toBe(1);
    expect(parsed.shots[0]?.frameDependency).toBe("start_frame_only");
    expect(parsed.shots[0]?.endFrame).toBeNull();
  });

  it("rejects a start-frame-only shot that includes an end frame", () => {
    expect(() =>
      shared.imageFrameListResponseSchema.parse({
        currentBatch: {
          id: "image_batch_20260323_ab12cd",
          sourceShotScriptId: "shot_script_20260323_ab12cd",
          shotCount: 1,
          totalRequiredFrameCount: 1,
          approvedShotCount: 0,
          updatedAt: "2026-03-23T12:00:00.000Z",
        },
        shots: [
          {
            id: "shot_ref_20260323_1",
            batchId: "image_batch_20260323_ab12cd",
            projectId: "proj_20260323_ab12cd",
            sourceShotScriptId: "shot_script_20260323_ab12cd",
            shotId: "shot_script_20260323_ab12cd_SC01",
            shotCode: "SC01-SG01-SH01",
            frameDependency: "start_frame_only",
            referenceStatus: "in_review",
            startFrame: {
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
              selectedCharacterIds: [],
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
              approvedAt: null,
              updatedAt: "2026-03-23T12:10:00.000Z",
              sourceTaskId: null,
            },
            endFrame: {
              id: "frame_20260323_end_1",
              batchId: "image_batch_20260323_ab12cd",
              projectId: "proj_20260323_ab12cd",
              sourceShotScriptId: "shot_script_20260323_ab12cd",
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              frameType: "end_frame",
              planStatus: "planned",
              imageStatus: "pending",
              selectedCharacterIds: [],
              matchedReferenceImagePaths: [],
              unmatchedCharacterIds: [],
              promptTextSeed: "清晨积水集市出口。",
              promptTextCurrent: "清晨积水集市出口。",
              negativePromptTextCurrent: null,
              promptUpdatedAt: null,
              imageAssetPath: null,
              imageWidth: null,
              imageHeight: null,
              provider: null,
              model: null,
              approvedAt: null,
              updatedAt: "2026-03-23T12:12:00.000Z",
              sourceTaskId: null,
            },
            updatedAt: "2026-03-23T12:12:00.000Z",
          },
        ],
      }),
    ).toThrow(/endFrame/i);
  });

  it("rejects a two-frame shot without an end frame", () => {
    expect(() =>
      shared.imageFrameListResponseSchema.parse({
        currentBatch: {
          id: "image_batch_20260323_ab12cd",
          sourceShotScriptId: "shot_script_20260323_ab12cd",
          shotCount: 1,
          totalRequiredFrameCount: 2,
          approvedShotCount: 0,
          updatedAt: "2026-03-23T12:00:00.000Z",
        },
        shots: [
          {
            id: "shot_ref_20260323_2",
            batchId: "image_batch_20260323_ab12cd",
            projectId: "proj_20260323_ab12cd",
            sourceShotScriptId: "shot_script_20260323_ab12cd",
            shotId: "shot_script_20260323_ab12cd_SC02",
            shotCode: "SC01-SG01-SH02",
            frameDependency: "start_and_end_frame",
            referenceStatus: "pending",
            startFrame: {
              id: "frame_20260323_start_2",
              batchId: "image_batch_20260323_ab12cd",
              projectId: "proj_20260323_ab12cd",
              sourceShotScriptId: "shot_script_20260323_ab12cd",
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 2,
              frameType: "start_frame",
              planStatus: "planned",
              imageStatus: "pending",
              selectedCharacterIds: [],
              matchedReferenceImagePaths: [],
              unmatchedCharacterIds: [],
              promptTextSeed: "黄昏的巷子。",
              promptTextCurrent: "黄昏的巷子。",
              negativePromptTextCurrent: null,
              promptUpdatedAt: null,
              imageAssetPath: null,
              imageWidth: null,
              imageHeight: null,
              provider: null,
              model: null,
              approvedAt: null,
              updatedAt: "2026-03-23T12:16:00.000Z",
              sourceTaskId: null,
            },
            endFrame: null,
            updatedAt: "2026-03-23T12:20:00.000Z",
          },
        ],
      }),
    ).toThrow(/endFrame/i);
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
