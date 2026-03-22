import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createGetProjectDetailUseCase,
} from "../src/index";

describe("get project detail use case", () => {
  it("returns premise metadata, the current master plot, and the current storyboard summary", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260317_ab12cd",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_20260321_ab12cd",
        status: "master_plot_in_review",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T00:00:00.000Z",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
    };
    const useCase = createGetProjectDetailUseCase({
      repository,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_20260317_ab12cd",
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
          sourceTaskId: "task_20260317_ab12cd",
          updatedAt: "2026-03-17T00:00:00.000Z",
          approvedAt: null,
        }),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn().mockResolvedValue({
          id: "storyboard_20260321_ab12cd",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          sourceTaskId: "task_20260321_storyboard",
          updatedAt: "2026-03-21T12:00:00.000Z",
          approvedAt: null,
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
                  audio: "A comet hum under distant thunder.",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        }),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "char_batch_v1",
          projectId: "proj_20260317_ab12cd",
          projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          characterCount: 2,
          storageDir: "projects/proj_20260317_ab12cd-my-story/character-sheets/batches/char_batch_v1",
          manifestRelPath: "character-sheets/batches/char_batch_v1/manifest.json",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-21T11:00:00.000Z",
        }),
        listCharactersByBatchId: vi.fn().mockResolvedValue([
          { id: "char_rin_1", status: "approved" },
          { id: "char_ivo_2", status: "in_review" },
        ]),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
    });

    expect(result.premise.bytes).toBe(88);
    expect(result.premise.path).toBe("premise/v1.md");
    expect(result.currentMasterPlot?.title).toBe("The Last Sky Choir");
    expect(result.currentCharacterSheetBatch?.approvedCharacterCount).toBe(1);
    expect(result.currentStoryboard).toEqual(
      expect.objectContaining({
        id: "storyboard_20260321_ab12cd",
        title: "The Last Sky Choir",
        sceneCount: 1,
        segmentCount: 1,
      }),
    );
  });

  it("throws when the project does not exist", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue(null),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
    };
    const useCase = createGetProjectDetailUseCase({
      repository,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
