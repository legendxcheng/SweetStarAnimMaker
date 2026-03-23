import { shotScriptGenerateQueueName } from "@sweet-star/core";
import { describe, expect, it, vi } from "vitest";

import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";
import { startWorker } from "../src/index";

describe("shot script worker integration", () => {
  it("routes queued task ids into the shot script process use case", async () => {
    const processMasterPlotGenerateTask = {
      execute: vi.fn(),
    };
    const processStoryboardGenerateTask = {
      execute: vi.fn(),
    };
    const processCharacterSheetsGenerateTask = {
      execute: vi.fn(),
    };
    const processCharacterSheetGenerateTask = {
      execute: vi.fn(),
    };
    const processShotScriptGenerateTask = {
      execute: vi.fn(),
    };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processMasterPlotGenerateTask,
        processStoryboardGenerateTask,
        processCharacterSheetsGenerateTask,
        processCharacterSheetGenerateTask,
        processShotScriptGenerateTask,
      },
      workerFactory,
    });

    const shotScriptWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === shotScriptGenerateQueueName,
    );
    const shotScriptWorker = workerFactory.mock.results[shotScriptWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await shotScriptWorker.processor({
      data: {
        taskId: "task_20260322_shot_script",
      },
    });

    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ queueName: shotScriptGenerateQueueName }),
    );
    expect(processShotScriptGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
    });

    await worker.close();

    expect(workerFactory).toHaveBeenCalledTimes(5);
    expect(close).toHaveBeenCalledTimes(5);
  });

  it("forwards shot script task input into the configured shot script provider", async () => {
    const shotScriptProvider = {
      generateShotScript: vi.fn().mockResolvedValue({
        rawResponse: "{\"title\":\"Generated shot script\"}",
        shotScript: {
          id: "shot_script_generated",
          title: "Generated shot script",
          sourceStoryboardId: "pending_source_storyboard_id",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
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
        },
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260322_shot_script",
          projectId: "proj_20260322_ab12cd",
          type: "shot_script_generate",
          status: "pending",
          queueName: "shot-script-generate",
          storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
          inputRelPath: "tasks/task_20260322_shot_script/input.json",
          outputRelPath: "tasks/task_20260322_shot_script/output.json",
          logRelPath: "tasks/task_20260322_shot_script/log.txt",
          errorMessage: null,
          createdAt: "2026-03-22T12:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
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
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: null,
          status: "shot_script_generating",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
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
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260322_shot_script",
          projectId: "proj_20260322_ab12cd",
          taskType: "shot_script_generate",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          storyboard: {
            id: "storyboard_20260322_ab12cd",
            title: "The Last Sky Choir",
            episodeTitle: "Episode 1",
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
          },
          promptTemplateKey: "shot_script.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue(
            "Turn this storyboard into shot script JSON:\n{{storyboard.title}}\n{{storyboard.scenes.0.segments.0.visual}}",
          ),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
      },
      masterPlotProvider: {
        generateMasterPlot: vi.fn(),
      },
      shotScriptProvider,
      characterSheetPromptProvider: {
        generateCharacterPrompt: vi.fn(),
      },
      characterSheetImageProvider: {
        generateCharacterSheetImage: vi.fn(),
      },
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_generated",
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T12:02:00.000Z"),
      },
    });

    await services.processShotScriptGenerateTask.execute({
      taskId: "task_20260322_shot_script",
    });

    expect(shotScriptProvider.generateShotScript).toHaveBeenCalledWith({
      promptText:
        "Turn this storyboard into shot script JSON:\nThe Last Sky Choir\nRain shakes across the cockpit glass.",
      variables: expect.objectContaining({
        storyboard: expect.objectContaining({
          id: "storyboard_20260322_ab12cd",
        }),
      }),
    });
  });
});
