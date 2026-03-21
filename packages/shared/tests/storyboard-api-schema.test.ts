import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("storyboard api schema", () => {
  it("exports a current storyboard schema", () => {
    const schema = shared.currentStoryboardResponseSchema;

    expect(schema).toBeDefined();
  });

  it("accepts a current storyboard response with scenes and segments", () => {
    const parsed = shared.currentStoryboardResponseSchema.parse({
      id: "storyboard_20260321_ab12cd",
      title: "The Last Sky Choir",
      episodeTitle: "Episode 1",
      sourceMasterPlotId: "master_plot_20260321_ab12cd",
      sourceTaskId: "task_20260321_cd34ef",
      updatedAt: "2026-03-21T12:30:00.000Z",
      approvedAt: null,
      scenes: [
        {
          id: "scene_1",
          order: 1,
          name: "Rin Hears The Sky",
          dramaticPurpose: "Introduce the emotional wound and the first impossible signal.",
          segments: [
            {
              id: "segment_1",
              order: 1,
              durationSec: 6,
              visual: "Rain trembles across the cockpit glass while a blue comet hums above the drowned skyline.",
              characterAction: "Rin freezes with one hand on the cracked controls.",
              dialogue: "",
              voiceOver: "That sound again.",
              audio: "",
              purpose: "Trigger the story's inciting beat.",
            },
          ],
        },
      ],
    });

    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0]?.segments).toHaveLength(1);
    expect(parsed.scenes[0]?.segments[0]?.dialogue).toBe("");
  });

  it("accepts a storyboard review workspace response", () => {
    const parsed = shared.storyboardReviewWorkspaceResponseSchema.parse({
      projectId: "proj_20260321_ab12cd",
      projectName: "The Last Sky Choir",
      projectStatus: "storyboard_in_review",
      currentStoryboard: {
        id: "storyboard_20260321_ab12cd",
        title: "The Last Sky Choir",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "master_plot_20260321_ab12cd",
        sourceTaskId: "task_20260321_cd34ef",
        updatedAt: "2026-03-21T12:30:00.000Z",
        approvedAt: null,
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Rin Hears The Sky",
            dramaticPurpose: "Introduce the emotional wound and the first impossible signal.",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual:
                  "Rain trembles across the cockpit glass while a blue comet hums above the drowned skyline.",
                characterAction: "Rin freezes with one hand on the cracked controls.",
                dialogue: "",
                voiceOver: "That sound again.",
                audio: "",
                purpose: "Trigger the story's inciting beat.",
              },
            ],
          },
        ],
      },
      latestTask: {
        id: "task_20260321_cd34ef",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "succeeded",
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:03:00.000Z",
        startedAt: "2026-03-21T12:01:00.000Z",
        finishedAt: "2026-03-21T12:03:00.000Z",
        errorMessage: null,
        files: {
          inputPath: "tasks/task_20260321_cd34ef/input.json",
          outputPath: "tasks/task_20260321_cd34ef/output.json",
          logPath: "tasks/task_20260321_cd34ef/log.txt",
        },
      },
      availableActions: {
        save: true,
        approve: true,
        reject: true,
      },
    });

    expect(parsed.projectStatus).toBe("storyboard_in_review");
    expect(parsed.currentStoryboard.scenes[0]?.segments[0]?.purpose).toContain("inciting");
  });

  it("accepts a full-document storyboard save request", () => {
    const parsed = shared.saveStoryboardRequestSchema.parse({
      title: "The Last Sky Choir",
      episodeTitle: "Episode 1",
      sourceMasterPlotId: "master_plot_20260321_ab12cd",
      sourceTaskId: "task_20260321_cd34ef",
      scenes: [
        {
          id: "scene_1",
          order: 1,
          name: "Rin Hears The Sky",
          dramaticPurpose: "Introduce the emotional wound and the first impossible signal.",
          segments: [
            {
              id: "segment_1",
              order: 1,
              durationSec: 6,
              visual:
                "Rain trembles across the cockpit glass while a blue comet hums above the drowned skyline.",
              characterAction: "Rin freezes with one hand on the cracked controls.",
              dialogue: "",
              voiceOver: "That sound again.",
              audio: "",
              purpose: "Trigger the story's inciting beat.",
            },
          ],
        },
      ],
    });

    expect(parsed.scenes[0]?.segments[0]?.durationSec).toBe(6);
  });
});
