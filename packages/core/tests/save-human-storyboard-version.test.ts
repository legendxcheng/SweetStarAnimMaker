import { describe, expect, it, vi } from "vitest";

import {
  CurrentStoryboardNotFoundError,
  createSaveHumanStoryboardVersionUseCase,
} from "../src/index";

describe("save current storyboard use case", () => {
  it("throws when there is no current storyboard to overwrite", async () => {
    const useCase = createSaveHumanStoryboardVersionUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260321_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260321_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260321_ab12cd",
          currentStoryboardId: null,
          status: "storyboard_in_review",
          createdAt: "2026-03-21T10:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-21T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        readCurrentStoryboard: vi.fn().mockResolvedValue(null),
        writeCurrentStoryboard: vi.fn(),
      },
      clock: {
        now: () => "2026-03-21T12:30:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260321_ab12cd",
        title: "The Last Sky Choir",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        sourceTaskId: "task_20260321_storyboard",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Rin Hears The Sky",
            dramaticPurpose: "Trigger the inciting beat.",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "Rain shakes across the cockpit glass.",
                characterAction: "Rin looks up.",
                dialogue: "",
                voiceOver: "That sound again.",
                audio: "",
                purpose: "Start the mystery.",
              },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CurrentStoryboardNotFoundError);
  });

  it("overwrites the current storyboard and keeps the project in review", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260321_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 120,
        currentMasterPlotId: "mp_20260321_ab12cd",
        currentStoryboardId: "storyboard_20260321_ab12cd",
        status: "storyboard_in_review",
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_20260321_ab12cd",
        title: null,
        episodeTitle: null,
        sourceMasterPlotId: "mp_20260321_ab12cd",
        sourceTaskId: "task_20260321_storyboard",
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: null,
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Old Scene",
            dramaticPurpose: "Old purpose",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "Old visual",
                characterAction: "Old action",
                dialogue: "",
                voiceOver: "",
                audio: "",
                purpose: "Old purpose",
              },
            ],
          },
        ],
      }),
      writeCurrentStoryboard: vi.fn(),
    };
    const useCase = createSaveHumanStoryboardVersionUseCase({
      projectRepository,
      storyboardStorage,
      clock: {
        now: () => "2026-03-21T12:30:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260321_ab12cd",
      title: "The Last Sky Choir",
      episodeTitle: "Episode 1",
      sourceMasterPlotId: "mp_20260321_ab12cd",
      sourceTaskId: "task_20260321_storyboard",
      scenes: [
        {
          id: "scene_1",
          order: 1,
          name: "Rin Hears The Sky",
          dramaticPurpose: "Trigger the inciting beat.",
          segments: [
            {
              id: "segment_1",
              order: 1,
              durationSec: 6,
              visual: "Rain shakes across the cockpit glass.",
              characterAction: "Rin looks up.",
              dialogue: "",
              voiceOver: "That sound again.",
              audio: "",
              purpose: "Start the mystery.",
            },
          ],
        },
      ],
    });

    expect(storyboardStorage.writeCurrentStoryboard).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260321_ab12cd-my-story",
      storyboard: expect.objectContaining({
        id: "storyboard_20260321_ab12cd",
        title: "The Last Sky Choir",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-21T12:30:00.000Z",
    });
    expect(result.id).toBe("storyboard_20260321_ab12cd");
  });
});
