import { describe, expect, it, vi } from "vitest";

import { startWorker } from "../src/index";
import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";

describe("storyboard worker integration", () => {
  it("routes queued task ids into the process use case", async () => {
    const processStoryboardGenerateTask = {
      execute: vi.fn(),
    };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processStoryboardGenerateTask,
      },
      workerFactory,
    });

    const createdWorker = workerFactory.mock.results[0]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await createdWorker.processor({
      data: {
        taskId: "task_20260317_ab12cd",
      },
    });

    expect(processStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
    });

    await worker.close();

    expect(close).toHaveBeenCalled();
  });

  it("forwards master-plot task input into the configured storyboard provider", async () => {
    const storyboardProvider = {
      generateStoryboard: vi.fn().mockResolvedValue({
        rawResponse: "{\"title\":\"Generated storyboard\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          id: "storyboard_generated",
          title: "Generated storyboard",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
          approvedAt: null,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "Opening",
              dramaticPurpose: "Set the emotional stakes.",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "Rain across a cracked cockpit canopy.",
                  characterAction: "Rin looks up toward the comet.",
                  dialogue: "",
                  voiceOver: "That song again.",
                  audio: "Low engine hum.",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        },
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          type: "storyboard_generate",
          status: "pending",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
          inputRelPath: "tasks/task_20260317_ab12cd/input.json",
          outputRelPath: "tasks/task_20260317_ab12cd/output.json",
          logRelPath: "tasks/task_20260317_ab12cd/log.txt",
          errorMessage: null,
          createdAt: "2026-03-17T12:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        }),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260317_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260317_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260317_ab12cd",
          currentStoryboardId: null,
          status: "storyboard_generating",
          createdAt: "2026-03-17T10:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-17T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "storyboard_generate",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          masterPlot: {
            title: "Generated master plot",
            logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
            synopsis:
              "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
            mainCharacters: ["Rin", "Ivo"],
            coreConflict:
              "Rin must choose between private escape and saving the city that exiled her.",
            emotionalArc: "She moves from bitterness to sacrificial hope.",
            endingBeat: "Rin turns the comet's music into a rising tide of light.",
            targetDurationSec: 480,
          },
          promptTemplateKey: "storyboard.generate",
          model: "gemini-3.1-pro-preview",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue(
            "Turn this master plot into storyboard scenes:\n{{masterPlot.logline}}\n{{masterPlot.synopsis}}",
          ),
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
      storyboardProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
    });

    await services.processStoryboardGenerateTask.execute({
      taskId: "task_20260317_ab12cd",
    });

    expect(storyboardProvider.generateStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      masterPlot: {
        title: "Generated master plot",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis:
          "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict:
          "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
      },
      promptText:
        "Turn this master plot into storyboard scenes:\nA disgraced pilot chases a cosmic song to save her flooded home.\nA fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
    });
  });
});
