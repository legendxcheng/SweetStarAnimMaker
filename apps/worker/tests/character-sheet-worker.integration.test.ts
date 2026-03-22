import { describe, expect, it, vi } from "vitest";

import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";

describe("character-sheet worker integration", () => {
  it("forwards batch task input into the configured prompt provider", async () => {
    const promptProvider = {
      generateCharacterPrompt: vi.fn().mockResolvedValue({
        promptText: "Silver pilot jacket",
        rawResponse: "Silver pilot jacket",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260317_character_sheets",
          projectId: "proj_20260317_ab12cd",
          type: "character_sheets_generate",
          status: "pending",
          queueName: "character-sheets-generate",
          storageDir:
            "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_character_sheets",
          inputRelPath: "tasks/task_20260317_character_sheets/input.json",
          outputRelPath: "tasks/task_20260317_character_sheets/output.json",
          logRelPath: "tasks/task_20260317_character_sheets/log.txt",
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
          currentCharacterSheetBatchId: "char_batch_task_20260317_character_sheets",
          currentStoryboardId: null,
          status: "character_sheets_generating",
          createdAt: "2026-03-17T10:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-17T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_character_sheets",
          projectId: "proj_20260317_ab12cd",
          taskType: "character_sheets_generate",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          mainCharacters: ["Rin"],
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Describe {{characterName}} using {{masterPlot.logline}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_20260317_ab12cd",
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
          sourceTaskId: "task_master_plot",
          updatedAt: "2026-03-17T12:00:00.000Z",
          approvedAt: "2026-03-17T12:05:00.000Z",
        }),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn().mockResolvedValue([]),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Describe {{characterName}} using {{masterPlot.logline}}"),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
      },
      characterSheetPromptProvider: promptProvider,
      characterSheetImageProvider: {
        generateCharacterSheetImage: vi.fn(),
      },
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_20260317_char_rin"),
      },
      clock: {
        now: vi.fn().mockReturnValue("2026-03-17T12:01:00.000Z"),
      },
    });

    await services.processCharacterSheetsGenerateTask.execute({
      taskId: "task_20260317_character_sheets",
    });

    expect(promptProvider.generateCharacterPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_20260317_ab12cd",
        characterName: "Rin",
        promptText:
          "Describe Rin using A disgraced pilot chases a cosmic song to save her flooded home.",
      }),
    );
  });
});
