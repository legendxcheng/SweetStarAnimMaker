import { describe, expect, it, vi } from "vitest";

import {
  CurrentShotScriptNotFoundError,
  createGetCurrentShotScriptUseCase,
} from "../src/index";

describe("get current shot script use case", () => {
  it("returns the current shot script document", async () => {
    const useCase = createGetCurrentShotScriptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: "shot_script_20260322_ab12cd",
          status: "shot_script_in_review",
          createdAt: "2026-03-22T12:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
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
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(result.id).toBe("shot_script_20260322_ab12cd");
    expect(result.shots[0]?.segmentId).toBe("segment_1");
  });

  it("throws when the project has no current shot script", async () => {
    const useCase = createGetCurrentShotScriptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_missing",
          name: "Missing Shot Script",
          slug: "missing-shot-script",
          storageDir: "projects/proj_20260322_missing-missing-shot-script",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260322_missing",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_missing",
          currentShotScriptId: null,
          status: "storyboard_approved",
          createdAt: "2026-03-22T12:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260322_missing",
      }),
    ).rejects.toBeInstanceOf(CurrentShotScriptNotFoundError);
  });
});
