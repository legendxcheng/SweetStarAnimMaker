import {
  frameImageGenerateQueueName,
  framePromptGenerateQueueName,
  imageBatchGenerateAllFramesQueueName,
  imageBatchRegenerateAllPromptsQueueName,
  imageBatchRegenerateFailedFramesQueueName,
  imageBatchRegenerateFailedPromptsQueueName,
  imagesGenerateQueueName,
} from "@sweet-star/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";
import { startWorker } from "../src/index";

describe("image worker integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("routes queued task ids into the images, frame prompt, and frame image processors", async () => {
    const services = {
      processMasterPlotGenerateTask: { execute: vi.fn() },
      processStoryboardGenerateTask: { execute: vi.fn() },
      processCharacterSheetsGenerateTask: { execute: vi.fn() },
      processCharacterSheetGenerateTask: { execute: vi.fn() },
      processShotScriptGenerateTask: { execute: vi.fn() },
      processShotScriptSegmentGenerateTask: { execute: vi.fn() },
      processImagesGenerateTask: { execute: vi.fn() },
      processImageBatchGenerateAllFramesTask: { execute: vi.fn() },
      processImageBatchRegenerateFailedFramesTask: { execute: vi.fn() },
      processImageBatchRegenerateAllPromptsTask: { execute: vi.fn() },
      processImageBatchRegenerateFailedPromptsTask: { execute: vi.fn() },
      processFramePromptGenerateTask: { execute: vi.fn() },
      processFrameImageGenerateTask: { execute: vi.fn() },
    };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services,
      workerFactory,
    });

    const imageBatchWorker = getWorker(workerFactory, imagesGenerateQueueName);
    await imageBatchWorker.processor({ data: { taskId: "task_images_generate_1" } });
    expect(services.processImagesGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_images_generate_1",
    });

    const generateAllFramesWorker = getWorker(workerFactory, imageBatchGenerateAllFramesQueueName);
    await generateAllFramesWorker.processor({ data: { taskId: "task_image_batch_generate_all_frames_1" } });
    expect(services.processImageBatchGenerateAllFramesTask.execute).toHaveBeenCalledWith({
      taskId: "task_image_batch_generate_all_frames_1",
    });

    const failedFramesWorker = getWorker(workerFactory, imageBatchRegenerateFailedFramesQueueName);
    await failedFramesWorker.processor({
      data: { taskId: "task_image_batch_regenerate_failed_frames_1" },
    });
    expect(services.processImageBatchRegenerateFailedFramesTask.execute).toHaveBeenCalledWith({
      taskId: "task_image_batch_regenerate_failed_frames_1",
    });

    const allPromptsWorker = getWorker(workerFactory, imageBatchRegenerateAllPromptsQueueName);
    await allPromptsWorker.processor({
      data: { taskId: "task_image_batch_regenerate_all_prompts_1" },
    });
    expect(services.processImageBatchRegenerateAllPromptsTask.execute).toHaveBeenCalledWith({
      taskId: "task_image_batch_regenerate_all_prompts_1",
    });

    const failedPromptsWorker = getWorker(
      workerFactory,
      imageBatchRegenerateFailedPromptsQueueName,
    );
    await failedPromptsWorker.processor({
      data: { taskId: "task_image_batch_regenerate_failed_prompts_1" },
    });
    expect(services.processImageBatchRegenerateFailedPromptsTask.execute).toHaveBeenCalledWith({
      taskId: "task_image_batch_regenerate_failed_prompts_1",
    });

    const framePromptWorker = getWorker(workerFactory, framePromptGenerateQueueName);
    await framePromptWorker.processor({ data: { taskId: "task_frame_prompt_1" } });
    expect(services.processFramePromptGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_frame_prompt_1",
    });
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: framePromptGenerateQueueName,
        concurrency: 20,
      }),
    );

    const frameImageWorker = getWorker(workerFactory, frameImageGenerateQueueName);
    await frameImageWorker.processor({ data: { taskId: "task_frame_image_1" } });
    expect(services.processFrameImageGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_frame_image_1",
    });
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: frameImageGenerateQueueName,
        concurrency: 20,
      }),
    );

    await worker.close();

    expect(workerFactory).toHaveBeenCalledTimes(13);
    expect(close).toHaveBeenCalledTimes(13);
  });

  it("forwards frame prompt and frame image task input into the configured providers", async () => {
    const framePromptProvider = {
      generateFramePrompt: vi.fn().mockResolvedValue({
        frameType: "start_frame",
        selectedCharacterIds: ["char_rin_1"],
        promptText: "雨夜市场入口，林站在霓虹雨幕前。",
        negativePromptText: null,
        rationale: null,
        rawResponse: "{}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };
    const shotImageProvider = {
      generateShotImage: vi.fn().mockResolvedValue({
        imageBytes: new Uint8Array([1, 2, 3]),
        rawResponse: "{}",
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        width: 1536,
        height: 1024,
      }),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: null,
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: null,
        currentShotScriptId: "shot_script_1",
        currentImageBatchId: "image_batch_1",
        status: "images_in_review",
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
        premiseUpdatedAt: "2026-03-24T10:00:00.000Z",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_start_1",
          imageStatus: "in_review",
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi
        .fn()
        .mockResolvedValueOnce({
          id: "frame_start_1",
          batchId: "image_batch_1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "start_frame",
          planStatus: "pending",
          imageStatus: "pending",
          selectedCharacterIds: [],
          matchedReferenceImagePaths: [],
          unmatchedCharacterIds: [],
          promptTextSeed: "",
          promptTextCurrent: "",
          negativePromptTextCurrent: null,
          promptUpdatedAt: null,
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          approvedAt: null,
          updatedAt: "2026-03-24T10:00:00.000Z",
          sourceTaskId: null,
          storageDir: "projects/proj_1-my-story/images/batches/image_batch_1/segments/segment_1/start-frame",
          planningRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/planning.json",
          promptSeedRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.seed.txt",
          promptCurrentRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.current.txt",
          currentImageRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.png",
          currentMetadataRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.json",
          promptVersionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.versions",
          versionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/versions",
        })
        .mockResolvedValueOnce({
          id: "frame_start_1",
          batchId: "image_batch_1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "start_frame",
          planStatus: "planned",
          imageStatus: "pending",
          selectedCharacterIds: ["char_rin_1"],
          matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
          unmatchedCharacterIds: [],
          promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
          promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
          negativePromptTextCurrent: null,
          promptUpdatedAt: "2026-03-24T10:01:00.000Z",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          approvedAt: null,
          updatedAt: "2026-03-24T10:01:00.000Z",
          sourceTaskId: null,
          storageDir: "projects/proj_1-my-story/images/batches/image_batch_1/segments/segment_1/start-frame",
          planningRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/planning.json",
          promptSeedRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.seed.txt",
          promptCurrentRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.current.txt",
          currentImageRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.png",
          currentMetadataRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.json",
          promptVersionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.versions",
          versionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/versions",
        }),
      updateFrame: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };

    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi
          .fn()
          .mockResolvedValueOnce({
            id: "task_frame_prompt_1",
            projectId: "proj_1",
            type: "frame_prompt_generate",
            status: "pending",
            queueName: "frame-prompt-generate",
            storageDir: "projects/proj_1-my-story/tasks/task_frame_prompt_1",
            inputRelPath: "tasks/task_frame_prompt_1/input.json",
            outputRelPath: "tasks/task_frame_prompt_1/output.json",
            logRelPath: "tasks/task_frame_prompt_1/log.txt",
            errorMessage: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
            startedAt: null,
            finishedAt: null,
          })
          .mockResolvedValueOnce({
            id: "task_frame_image_1",
            projectId: "proj_1",
            type: "frame_image_generate",
            status: "pending",
            queueName: "frame-image-generate",
            storageDir: "projects/proj_1-my-story/tasks/task_frame_image_1",
            inputRelPath: "tasks/task_frame_image_1/input.json",
            outputRelPath: "tasks/task_frame_image_1/output.json",
            logRelPath: "tasks/task_frame_image_1/log.txt",
            errorMessage: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
            startedAt: null,
            finishedAt: null,
          })
          .mockResolvedValueOnce({
            id: "task_frame_image_1",
            projectId: "proj_1",
            type: "frame_image_generate",
            status: "pending",
            queueName: "frame-image-generate",
            storageDir: "projects/proj_1-my-story/tasks/task_frame_image_1",
            inputRelPath: "tasks/task_frame_image_1/input.json",
            outputRelPath: "tasks/task_frame_image_1/output.json",
            logRelPath: "tasks/task_frame_image_1/log.txt",
            errorMessage: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
            startedAt: null,
            finishedAt: null,
          }),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository,
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi
          .fn()
          .mockResolvedValueOnce({
            taskId: "task_frame_prompt_1",
            projectId: "proj_1",
            taskType: "frame_prompt_generate",
            batchId: "image_batch_1",
            shotId: "shot_1",
            frameId: "frame_start_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            frameType: "start_frame",
          })
          .mockResolvedValueOnce({
            taskId: "task_frame_image_1",
            projectId: "proj_1",
            taskType: "frame_image_generate",
            batchId: "image_batch_1",
            frameId: "frame_start_1",
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
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_1",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_1",
          sourceTaskId: "task_shot_script_1",
          updatedAt: "2026-03-24T10:00:00.000Z",
          approvedAt: "2026-03-24T10:00:00.000Z",
          segmentCount: 1,
          shotCount: 1,
          totalDurationSec: 6,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "雨夜开场",
              summary: "林在雨夜市场边停下。",
              durationSec: 6,
              status: "approved",
              lastGeneratedAt: "2026-03-24T10:00:00.000Z",
              approvedAt: "2026-03-24T10:00:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  shotCode: "S01-SG01-SH01",
                  purpose: "建立空间",
                  visual: "雨夜市场与反光",
                  subject: "林",
                  action: "林停下抬头",
                  dialogue: null,
                  os: null,
                  audio: "雨声与风铃声",
                  transitionHint: null,
                  continuityNotes: "左肩书包保持一致",
                },
              ],
            },
          ],
        }),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn().mockResolvedValue([
          {
            id: "char_rin_1",
            projectId: "proj_1",
            projectStorageDir: "projects/proj_1-my-story",
            batchId: "char_batch_v1",
            sourceMasterPlotId: "mp_1",
            characterName: "林",
            promptTextGenerated: "银色飞行夹克",
            promptTextCurrent: "银色飞行夹克",
            imageAssetPath: "character-sheets/char_rin/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            status: "approved",
            updatedAt: "2026-03-24T10:00:00.000Z",
            approvedAt: "2026-03-24T10:00:00.000Z",
            sourceTaskId: "task_char_1",
            storageDir: "projects/proj_1-my-story/character-sheets/char_rin",
            currentImageRelPath: "character-sheets/char_rin/current.png",
            currentMetadataRelPath: "character-sheets/char_rin/current.json",
            promptGeneratedRelPath: "character-sheets/char_rin/prompt.generated.txt",
            promptCurrentRelPath: "character-sheets/char_rin/prompt.current.txt",
            promptVariablesRelPath: "character-sheets/char_rin/prompt.variables.json",
            imagePromptRelPath: "character-sheets/char_rin/image-prompt.txt",
            versionsStorageDir: "character-sheets/char_rin/versions",
            referenceImages: [],
          },
        ]),
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
        readCurrentCharacterSheet: vi.fn().mockResolvedValue({
          id: "char_rin_1",
          projectId: "proj_1",
          batchId: "char_batch_v1",
          sourceMasterPlotId: "mp_1",
          characterName: "林",
          promptTextGenerated: "银色飞行夹克",
          promptTextCurrent: "银色飞行夹克",
          imageAssetPath: "character-sheets/char_rin/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
          provider: "turnaround-image",
          model: "doubao-seedream-5-0-260128",
          status: "approved",
          updatedAt: "2026-03-24T10:00:00.000Z",
          approvedAt: "2026-03-24T10:00:00.000Z",
          sourceTaskId: "task_char_1",
          referenceImages: [],
        }),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getImageContent: vi.fn(),
        getReferenceImageContent: vi.fn(),
      },
      shotImageRepository,
      shotImageStorage,
      framePromptProvider,
      shotImageProvider,
      taskQueue: {
        enqueue: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T10:01:00.000Z")
          .mockReturnValueOnce("2026-03-24T10:02:00.000Z")
          .mockReturnValueOnce("2026-03-24T10:03:00.000Z")
          .mockReturnValueOnce("2026-03-24T10:04:00.000Z"),
      },
    });

    await services.processFramePromptGenerateTask.execute({
      taskId: "task_frame_prompt_1",
    });
    await services.processFrameImageGenerateTask.execute({
      taskId: "task_frame_image_1",
    });

    expect(framePromptProvider.generateFramePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_1",
        frameType: "start_frame",
      }),
    );
    expect(shotImageProvider.generateShotImage).toHaveBeenCalledWith(
      expect.objectContaining({
        frameId: "frame_start_1",
        promptText: expect.stringContaining("雨夜市场入口，林站在霓虹雨幕前。"),
      }),
    );
    expect(shotImageProvider.generateShotImage).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: expect.stringContaining("画面风格：赛璐璐动画，冷色霓虹雨夜，电影感光影"),
      }),
    );
  });

  it("builds the frame image provider with a 16:9 default size", async () => {
    vi.stubEnv("VECTORENGINE_API_TOKEN", "test-token");
    vi.stubEnv("VECTORENGINE_BASE_URL", "https://api.vectorengine.ai");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            b64_json: "AQID",
            width: 2848,
            height: 1600,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_frame_image_16_9",
          projectId: "proj_1",
          type: "frame_image_generate",
          status: "pending",
          queueName: "frame-image-generate",
          storageDir: "projects/proj_1-my-story/tasks/task_frame_image_16_9",
          inputRelPath: "tasks/task_frame_image_16_9/input.json",
          outputRelPath: "tasks/task_frame_image_16_9/output.json",
          logRelPath: "tasks/task_frame_image_16_9/log.txt",
          errorMessage: null,
          createdAt: "2026-03-24T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
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
          id: "proj_1",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_1-my-story",
          visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_1",
          currentCharacterSheetBatchId: "char_batch_1",
          currentStoryboardId: "storyboard_1",
          currentShotScriptId: "shot_script_1",
          currentImageBatchId: "image_batch_1",
          status: "images_generating",
          createdAt: "2026-03-24T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
          premiseUpdatedAt: "2026-03-24T10:00:00.000Z",
        }),
        listAll: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_frame_image_16_9",
          projectId: "proj_1",
          taskType: "frame_image_generate",
          batchId: "image_batch_1",
          frameId: "frame_start_1",
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
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn().mockResolvedValue([]),
        getImageContent: vi.fn(),
        getReferenceImageContent: vi.fn(),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn().mockResolvedValue([
          {
            id: "frame_start_1",
            imageStatus: "in_review",
          },
        ]),
        insertFrame: vi.fn(),
        findFrameById: vi.fn().mockResolvedValue({
          id: "frame_start_1",
          batchId: "image_batch_1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "start_frame",
          planStatus: "planned",
          imageStatus: "generating",
          selectedCharacterIds: [],
          matchedReferenceImagePaths: [],
          unmatchedCharacterIds: [],
          promptTextSeed: "原始规划 Prompt",
          promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
          negativePromptTextCurrent: "低清晰度、崩坏手部",
          promptUpdatedAt: "2026-03-24T10:00:00.000Z",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          approvedAt: null,
          updatedAt: "2026-03-24T10:00:00.000Z",
          sourceTaskId: "task_frame_image_16_9",
          storageDir: "projects/proj_1-my-story/images/batches/image_batch_1/segments/segment_1/start-frame",
          planningRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/planning.json",
          promptSeedRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.seed.txt",
          promptCurrentRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.current.txt",
          currentImageRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.png",
          currentMetadataRelPath: "images/batches/image_batch_1/segments/segment_1/start-frame/current.json",
          promptVersionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/prompt.versions",
          versionsStorageDir: "images/batches/image_batch_1/segments/segment_1/start-frame/versions",
        }),
        updateFrame: vi.fn(),
      },
      shotImageStorage: {
        writeBatchManifest: vi.fn(),
        writeFramePlanning: vi.fn(),
        writeFramePromptFiles: vi.fn(),
        writeFramePromptVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        writeImageVersion: vi.fn(),
        readCurrentFrame: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T10:01:00.000Z")
          .mockReturnValueOnce("2026-03-24T10:02:00.000Z"),
      },
    });

    await services.processFrameImageGenerateTask.execute({
      taskId: "task_frame_image_16_9",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.size).toBe("2848x1600");
  });
});

function getWorker(
  workerFactory: ReturnType<typeof vi.fn>,
  queueName: string,
) {
  const index = workerFactory.mock.calls.findIndex(([input]) => input.queueName === queueName);

  return workerFactory.mock.results[index]?.value as {
    processor(job: { data: { taskId: string } }): Promise<void>;
  };
}


