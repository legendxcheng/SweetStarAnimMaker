import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("shot script api schema", () => {
  it("does not expose legacy whole-script review payload schemas", () => {
    expect("saveShotScriptRequestSchema" in shared).toBe(false);
    expect("approveShotScriptRequestSchema" in shared).toBe(false);
    expect("rejectShotScriptRequestSchema" in shared).toBe(false);
  });

  it("accepts a current shot-script summary payload", () => {
    const parsed = shared.currentShotScriptSummaryResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Episode 1 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      segmentCount: 2,
      shotCount: 3,
      totalDurationSec: 12,
    });

    expect(parsed.segmentCount).toBe(2);
    expect(parsed.shotCount).toBe(3);
  });

  it("accepts a generating shot-script summary payload with zero shots", () => {
    const parsed = shared.currentShotScriptSummaryResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Episode 1 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      segmentCount: 2,
      shotCount: 0,
      totalDurationSec: null,
    });

    expect(parsed.segmentCount).toBe(2);
    expect(parsed.shotCount).toBe(0);
  });

  it("accepts a full current shot-script payload", () => {
    const parsed = shared.currentShotScriptResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Ep01 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      segmentCount: 2,
      shotCount: 3,
      totalDurationSec: 12,
      segments: [
        {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "集市压境",
          summary: "林夏在积水集市口停住，发现对手已经先一步封住退路。",
          durationSec: 6,
          status: "in_review",
          lastGeneratedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01-SH01",
              durationSec: 2,
              purpose: "先交代主角被堵在集市入口。",
              visual: "清晨积水漫过青石路，摊棚和红灯笼歪斜压向画面前景。",
              subject: "林夏背着湿透的布包站在水线边。",
              action: "她停住脚步，抬眼看向前方被占住的通道。",
              frameDependency: "start_frame_only",
              dialogue: "无",
              os: "来得比我还快。",
              audio: "水声、摊布拍打声、远处人群骚动。",
              transitionHint: "切到前方堵路者的压迫感近景。",
              continuityNotes: "布包始终挂在左肩，裤脚被水打湿。",
            },
          ],
        },
      ],
    });

    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0]?.shots[0]?.segmentId).toBe("segment_1");
    expect(parsed.segments[0]?.shots[0]?.frameDependency).toBe("start_frame_only");
  });

  it("accepts a generating current shot-script payload with empty segment shots", () => {
    const parsed = shared.currentShotScriptResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Ep01 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      segmentCount: 2,
      shotCount: 0,
      totalDurationSec: null,
      segments: [
        {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: null,
          summary: "林夏在积水集市口停住，发现对手已经先一步封住退路。",
          durationSec: 6,
          status: "generating",
          lastGeneratedAt: null,
          approvedAt: null,
          shots: [],
        },
      ],
    });

    expect(parsed.shotCount).toBe(0);
    expect(parsed.segments[0]?.shots).toEqual([]);
  });

  it("accepts a save-shot-script-segment request payload", () => {
    const parsed = shared.saveShotScriptSegmentRequestSchema.parse({
      name: "集市压境",
      summary: "林夏确认对手已经堵住出口。",
      durationSec: 6,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01-SH01",
          durationSec: 2,
          purpose: "先交代主角被堵在集市入口。",
          visual: "清晨积水漫过青石路，摊棚和红灯笼歪斜压向画面前景。",
          subject: "林夏背着湿透的布包站在水线边。",
          action: "她停住脚步，抬眼看向前方被占住的通道。",
          frameDependency: "start_and_end_frame",
          dialogue: "无",
          os: "来得比我还快。",
          audio: "水声、摊布拍打声、远处人群骚动。",
          transitionHint: "切到前方堵路者的压迫感近景。",
          continuityNotes: "布包始终挂在左肩，裤脚被水打湿。",
        },
      ],
    });

    expect(parsed.shots[0]?.os).toBe("来得比我还快。");
    expect(parsed.shots[0]?.frameDependency).toBe("start_and_end_frame");
  });

  it("accepts a regenerate-shot-script-segment request payload", () => {
    const parsed = shared.regenerateShotScriptSegmentRequestSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("accepts an approve-shot-script-segment request payload", () => {
    const parsed = shared.approveShotScriptSegmentRequestSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("accepts an approve-all-shot-script-segments request payload", () => {
    const parsed = shared.approveAllShotScriptSegmentsRequestSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("accepts a shot-script review workspace response", () => {
    const parsed = shared.shotScriptReviewWorkspaceResponseSchema.parse({
      projectId: "proj_20260322_ab12cd",
      projectName: "My Story",
      projectStatus: "shot_script_in_review",
      currentShotScript: {
        id: "shot_script_20260322_ab12cd",
        title: "Ep01 Shot Script",
        sourceStoryboardId: "storyboard_20260322_ab12cd",
        sourceTaskId: "task_20260322_shot_script",
        updatedAt: "2026-03-22T12:00:00.000Z",
        approvedAt: null,
        segmentCount: 1,
        shotCount: 1,
        totalDurationSec: 4,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "集市压境",
            summary: "林夏确认对手已经堵住出口。",
            durationSec: 4,
            status: "in_review",
            lastGeneratedAt: "2026-03-22T12:00:00.000Z",
            approvedAt: null,
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 4,
                purpose: "先交代主角被堵在集市入口。",
                visual: "清晨积水漫过青石路，摊棚和红灯笼歪斜压向画面前景。",
                subject: "林夏背着湿透的布包站在水线边。",
                action: "她停住脚步，抬眼看向前方被占住的通道。",
                frameDependency: "start_frame_only",
                dialogue: "无",
                os: "来得比我还快。",
                audio: "水声、摊布拍打声、远处人群骚动。",
                transitionHint: "切到前方堵路者的压迫感近景。",
                continuityNotes: "布包始终挂在左肩，裤脚被水打湿。",
              },
            ],
          },
        ],
      },
      latestReview: null,
      availableActions: {
        saveSegment: true,
        regenerateSegment: true,
        approveSegment: true,
        approveAll: true,
      },
      latestTask: {
        id: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        type: "shot_script_segment_generate",
        status: "succeeded",
        createdAt: "2026-03-22T11:55:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        startedAt: "2026-03-22T11:56:00.000Z",
        finishedAt: "2026-03-22T12:00:00.000Z",
        errorMessage: null,
        files: {
          inputPath: "tasks/task_20260322_shot_script/input.json",
          outputPath: "tasks/task_20260322_shot_script/output.json",
          logPath: "tasks/task_20260322_shot_script/log.txt",
        },
      },
    });

    expect(parsed.projectStatus).toBe("shot_script_in_review");
    expect(parsed.latestReview).toBeNull();
    expect(parsed.currentShotScript.segments[0]?.status).toBe("in_review");
  });
});
