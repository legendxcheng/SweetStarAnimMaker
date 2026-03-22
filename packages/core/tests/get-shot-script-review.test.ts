import { describe, expect, it, vi } from "vitest";

import { createGetShotScriptReviewUseCase } from "../src/index";

describe("get shot script review use case", () => {
  it("returns the review workspace for the current shot script", async () => {
    const useCase = createGetShotScriptReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: "shot_script_20260322_ab12cd",
          status: "shot_script_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
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
        }),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "ssr_20260322_ab12cd",
          projectId: "proj_20260322_ab12cd",
          shotScriptId: "shot_script_20260322_ab12cd",
          action: "reject",
          reason: "Need tighter continuity notes.",
          nextAction: "edit_manually",
          triggeredTaskId: null,
          createdAt: "2026-03-22T12:05:00.000Z",
        }),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "task_20260322_shot_script",
          projectId: "proj_20260322_ab12cd",
          type: "shot_script_generate",
          status: "succeeded",
          queueName: "shot-script-generate",
          storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
          inputRelPath: "tasks/task_20260322_shot_script/input.json",
          outputRelPath: "tasks/task_20260322_shot_script/output.json",
          logRelPath: "tasks/task_20260322_shot_script/log.txt",
          errorMessage: null,
          createdAt: "2026-03-22T11:50:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          startedAt: "2026-03-22T11:52:00.000Z",
          finishedAt: "2026-03-22T12:00:00.000Z",
        }),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(result.projectStatus).toBe("shot_script_in_review");
    expect(result.projectName).toBe("My Story");
    expect(result.currentShotScript.id).toBe("shot_script_20260322_ab12cd");
    expect(result.latestReview?.nextAction).toBe("edit_manually");
    expect(result.latestTask?.type).toBe("shot_script_generate");
    expect(result.availableActions).toEqual({
      save: true,
      approve: true,
      reject: true,
    });
  });
});
