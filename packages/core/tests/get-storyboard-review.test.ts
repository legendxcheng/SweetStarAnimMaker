import { describe, expect, it, vi } from "vitest";

import { createGetStoryboardReviewUseCase } from "../src/index";

describe("get storyboard review use case", () => {
  it("returns the review workspace for the current storyboard", async () => {
    const useCase = createGetStoryboardReviewUseCase({
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
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "task_20260321_storyboard",
          projectId: "proj_20260321_ab12cd",
          type: "storyboard_generate",
          status: "succeeded",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
          inputRelPath: "tasks/task_20260321_storyboard/input.json",
          outputRelPath: "tasks/task_20260321_storyboard/output.json",
          logRelPath: "tasks/task_20260321_storyboard/log.txt",
          errorMessage: null,
          createdAt: "2026-03-21T11:50:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          startedAt: "2026-03-21T11:52:00.000Z",
          finishedAt: "2026-03-21T12:00:00.000Z",
        }),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260321_ab12cd",
    });

    expect(result.projectStatus).toBe("storyboard_in_review");
    expect(result.projectName).toBe("My Story");
    expect(result.currentStoryboard.id).toBe("storyboard_20260321_ab12cd");
    expect(result.latestTask?.type).toBe("storyboard_generate");
    expect(result.availableActions).toEqual({
      save: true,
      approve: true,
      reject: true,
    });
  });
});
