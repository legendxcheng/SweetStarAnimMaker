import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("shot script api schema", () => {
  it("accepts a current shot-script summary payload", () => {
    const parsed = shared.currentShotScriptSummaryResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Episode 1 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      shotCount: 3,
      totalDurationSec: 12,
    });

    expect(parsed.shotCount).toBe(3);
  });

  it("accepts a full current shot-script payload", () => {
    const parsed = shared.currentShotScriptResponseSchema.parse({
      id: "shot_script_20260322_ab12cd",
      title: "Ep01 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:00:00.000Z",
      approvedAt: null,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01",
          shotPurpose: "Establish the flooded market",
          subjectCharacters: ["Rin"],
          environment: "Flooded dawn market",
          framing: "medium wide shot",
          cameraAngle: "eye level",
          composition: "Rin framed by hanging lanterns",
          actionMoment: "Rin pauses at the waterline",
          emotionTone: "uneasy anticipation",
          continuityNotes: "Keep soaked satchel on left shoulder",
          imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
          negativePrompt: null,
          motionHint: null,
          durationSec: 4,
        },
      ],
    });

    expect(parsed.shots).toHaveLength(1);
    expect(parsed.shots[0]?.segmentId).toBe("segment_1");
  });

  it("accepts a save-shot-script request payload", () => {
    const parsed = shared.saveShotScriptRequestSchema.parse({
      title: "Episode 1 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01",
          shotPurpose: "Establish the flooded market",
          subjectCharacters: ["Rin"],
          environment: "Flooded dawn market",
          framing: "medium wide shot",
          cameraAngle: "eye level",
          composition: "Rin framed by hanging lanterns",
          actionMoment: "Rin pauses at the waterline",
          emotionTone: "uneasy anticipation",
          continuityNotes: "Keep soaked satchel on left shoulder",
          imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
          negativePrompt: "extra limbs",
          motionHint: null,
          durationSec: 4,
        },
      ],
    });

    expect(parsed.shots[0]?.negativePrompt).toBe("extra limbs");
  });

  it("accepts a reject-shot-script request payload", () => {
    const parsed = shared.rejectShotScriptRequestSchema.parse({
      reason: "Need tighter continuity notes.",
      nextAction: "regenerate",
    });

    expect(parsed.nextAction).toBe("regenerate");
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
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Establish the flooded market",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by hanging lanterns",
            actionMoment: "Rin pauses at the waterline",
            emotionTone: "uneasy anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: null,
            durationSec: 4,
          },
        ],
      },
      latestReview: {
        id: "ssr_20260322_ab12cd",
        projectId: "proj_20260322_ab12cd",
        shotScriptId: "shot_script_20260322_ab12cd",
        action: "reject",
        reason: "Need tighter continuity notes.",
        nextAction: "edit_manually",
        triggeredTaskId: null,
        createdAt: "2026-03-22T12:10:00.000Z",
      },
      availableActions: {
        save: true,
        approve: true,
        reject: true,
      },
      latestTask: {
        id: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        type: "shot_script_generate",
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
    expect(parsed.latestReview?.nextAction).toBe("edit_manually");
  });
});
