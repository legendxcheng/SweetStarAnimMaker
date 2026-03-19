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

  it("forwards premise-driven prompt input into the configured master-plot provider", async () => {
    const masterPlotProvider = {
      generateMasterPlot: vi.fn().mockResolvedValue({
        rawResponse: "{\"title\":\"Generated master plot\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
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
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          type: "master_plot_generate",
          status: "pending",
          queueName: "master-plot-generate",
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
          currentMasterPlotId: null,
          status: "master_plot_generating",
          createdAt: "2026-03-17T10:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-17T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "master_plot_generate",
          premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
          promptTemplateKey: "master_plot.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Turn this premise into a master plot:\n{{premiseText}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      masterPlotProvider,
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

    expect(masterPlotProvider.generateMasterPlot).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText:
        "Turn this premise into a master plot:\nA washed-up pilot discovers a singing comet above a drowned city.",
    });
  });
});
