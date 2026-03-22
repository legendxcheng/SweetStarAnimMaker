import { describe, expect, it, vi } from "vitest";

import {
  CurrentShotScriptNotFoundError,
  createApproveShotScriptUseCase,
} from "../src/index";

describe("approve shot script use case", () => {
  it("throws when there is no current shot script", async () => {
    const useCase = createApproveShotScriptUseCase({
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
          currentShotScriptId: null,
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
        readCurrentShotScript: vi.fn().mockResolvedValue(null),
        writeCurrentShotScript: vi.fn(),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      clock: {
        now: () => "2026-03-22T12:40:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260322_ab12cd",
      }),
    ).rejects.toBeInstanceOf(CurrentShotScriptNotFoundError);
  });

  it("stamps approvedAt, writes an approval review, and updates the project status", async () => {
    const projectRepository = {
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
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
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
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const useCase = createApproveShotScriptUseCase({
      projectRepository,
      shotScriptStorage,
      shotScriptReviewRepository,
      clock: {
        now: () => "2026-03-22T12:40:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      shotScript: expect.objectContaining({
        approvedAt: "2026-03-22T12:40:00.000Z",
      }),
    });
    expect(shotScriptReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_20260322_ab12cd",
        shotScriptId: "shot_script_20260322_ab12cd",
        action: "approve",
        nextAction: null,
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "shot_script_approved",
      updatedAt: "2026-03-22T12:40:00.000Z",
    });
    expect(result.approvedAt).toBe("2026-03-22T12:40:00.000Z");
  });
});
