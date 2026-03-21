import { describe, expect, it, vi } from "vitest";

import {
  CurrentStoryboardNotFoundError,
  createRejectStoryboardUseCase,
} from "../src/index";

describe("reject storyboard use case", () => {
  it("throws when there is no current storyboard", async () => {
    const useCase = createRejectStoryboardUseCase({
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
      createStoryboardGenerateTask: {
        execute: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260321_ab12cd",
      }),
    ).rejects.toBeInstanceOf(CurrentStoryboardNotFoundError);
  });

  it("creates a new storyboard task and returns the project to generating", async () => {
    const createStoryboardGenerateTask = {
      execute: vi.fn().mockResolvedValue({
        id: "task_20260321_next",
        updatedAt: "2026-03-21T12:00:00.000Z",
      }),
    };
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
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const useCase = createRejectStoryboardUseCase({
      projectRepository,
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        readCurrentStoryboard: vi.fn().mockResolvedValue({
          id: "storyboard_20260321_ab12cd",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "mp_20260321_ab12cd",
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
                  audio: "",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        }),
        writeCurrentStoryboard: vi.fn(),
      },
      createStoryboardGenerateTask,
    });

    const result = await useCase.execute({
      projectId: "proj_20260321_ab12cd",
    });

    expect(createStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "storyboard_generating",
      updatedAt: "2026-03-21T12:00:00.000Z",
    });
    expect(result.id).toBe("task_20260321_next");
  });
});
