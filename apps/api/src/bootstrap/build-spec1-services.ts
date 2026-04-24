import crypto from "node:crypto";

import {
  createApproveAllImageFramesUseCase,
  createApproveAllVideoSegmentsUseCase,
  createApproveAllShotScriptSegmentsUseCase,
  createApproveCharacterSheetUseCase,
  createApproveSceneSheetUseCase,
  createApproveImageFrameUseCase,
  createApproveVideoSegmentUseCase,
  createApproveMasterPlotUseCase,
  createApproveShotScriptSegmentUseCase,
  createApproveStoryboardUseCase,
  createCreateImagesGenerateTaskUseCase,
  createCreateImageBatchGenerateAllFramesTaskUseCase,
  createCreateImageBatchRegenerateAllPromptsTaskUseCase,
  createCreateImageBatchRegenerateFailedFramesTaskUseCase,
  createCreateImageBatchRegenerateFailedPromptsTaskUseCase,
  createCreateMasterPlotGenerateTaskUseCase,
  createCreateCharacterSheetsGenerateTaskUseCase,
  createCreateSceneSheetsGenerateTaskUseCase,
  createCreateFinalCutGenerateTaskUseCase,
  createCreateShotScriptGenerateTaskUseCase,
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createCreateVideosGenerateTaskUseCase,
  createAddCharacterSheetReferenceImagesUseCase,
  createDeleteCharacterSheetReferenceImageUseCase,
  createGetCharacterSheetImageContentUseCase,
  createGetCharacterSheetUseCase,
  createGetCharacterSheetReferenceImageContentUseCase,
  createGetFinalCutUseCase,
  createGetImageFrameUseCase,
  createGetImageFrameContentUseCase,
  createGetProjectAssetContentUseCase,
  createGetCurrentShotScriptUseCase,
  createGetCurrentStoryboardUseCase,
  createGetMasterPlotReviewUseCase,
  createGetProjectDetailUseCase,
  createGetShotScriptReviewUseCase,
  createGetStoryboardReviewUseCase,
  createGetTaskDetailUseCase,
  createGetVideoUseCase,
  createListCharacterSheetsUseCase,
  createListSceneSheetsUseCase,
  createListImagesUseCase,
  createListVideosUseCase,
  createListProjectsUseCase,
  createGenerateFrameImageUseCase,
  createRegenerateAllFramePromptsUseCase,
  createRegenerateFailedFrameImagesUseCase,
  createRegenerateFailedFramePromptsUseCase,
  createRegenerateUnfinishedFramePromptsUseCase,
  createRegenerateAllVideoPromptsUseCase,
  createRegenerateCharacterSheetsUseCase,
  createRegenerateShotScriptSegmentUseCase,
  createRegenerateImagesUseCase,
  createRegenerateVideoPromptUseCase,
  createRegenerateVideoSegmentUseCase,
  createRegenerateMasterPlotUseCase,
  createRegenerateCharacterSheetUseCase,
  createRegenerateSceneSheetUseCase,
  createRegenerateFramePromptUseCase,
  createRegenerateShotScriptUseCase,
  createRegenerateStoryboardUseCase,
  createResetProjectPremiseUseCase,
  createRejectMasterPlotUseCase,
  createRejectStoryboardUseCase,
  createSaveSegmentVideoConfigUseCase,
  createSaveHumanMasterPlotUseCase,
  createSaveHumanShotScriptSegmentUseCase,
  createSaveHumanStoryboardVersionUseCase,
  createUploadSegmentVideoAudioUseCase,
  createUpdateCharacterSheetPromptUseCase,
  createUpdateSceneSheetPromptUseCase,
  createUpdateFramePromptUseCase,
  createUpdateVideoPromptUseCase,
  createUpdateProjectScriptUseCase,
  type TaskIdGenerator,
  type TaskQueue,
  type VideoPromptProvider,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createCharacterSheetStorage,
  createSceneSheetStorage,
  createFileScriptStorage,
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteSceneSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotImageRepository,
  createSqliteShotScriptReviewRepository,
  createSqliteTaskRepository,
  createShotScriptStorage,
  createShotImageStorage,
  createStoryboardStorage,
  createTaskFileStorage,
  createVideoStorage,
  createVideoPromptProviderWithGrokFallback,
  initializeSqliteSchema,
  createSqliteVideoRepository,
  createGeminiVideoPromptProvider,
  createGrokVideoPromptProvider,
} from "@sweet-star/services";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface BuildSpec1ServicesOptions {
  workspaceRoot: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  videoPromptProvider?: VideoPromptProvider;
}

export function buildSpec1Services(options: BuildSpec1ServicesOptions) {
  const paths = createLocalDataPaths(options.workspaceRoot);
  const db = createSqliteDb({ paths });

  initializeSqliteSchema(db);

  const repository = createSqliteProjectRepository({ db });
  const premiseStorage = createFileScriptStorage({ paths });
  const taskRepository = createSqliteTaskRepository({ db });
  const taskFileStorage = createTaskFileStorage({ paths });
  const storyboardStorage = createStoryboardStorage({ paths });
  const shotScriptStorage = createShotScriptStorage({ paths });
  const characterSheetRepository = createSqliteCharacterSheetRepository({ db });
  const sceneSheetRepository = createSqliteSceneSheetRepository({ db });
  const shotImageRepository = createSqliteShotImageRepository({ db });
  const videoRepository = createSqliteVideoRepository({ db });
  const shotScriptReviewRepository = createSqliteShotScriptReviewRepository({ db });
  const characterSheetStorage = createCharacterSheetStorage({ paths });
  const sceneSheetStorage = createSceneSheetStorage({ paths });
  const shotImageStorage = createShotImageStorage({ paths });
  const videoStorage = createVideoStorage({ paths });
  const videoPromptProvider =
    options.videoPromptProvider ??
    createVideoPromptProviderWithGrokFallback(
      createGeminiVideoPromptProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.VIDEO_PROMPT_MODEL,
      }),
      createGrokVideoPromptProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.VIDEO_PROMPT_GROK_MODEL,
      }),
    );
  const masterPlotStorage = storyboardStorage;
  const clock = {
    now: () => new Date().toISOString(),
  };
  let redisConnection: IORedis | null = null;
  const bullMqQueues = new Map<string, Queue>();
  const bullMqTaskQueues = new Map<string, TaskQueue>();
  let taskQueue: TaskQueue | null = options.taskQueue ?? null;
  const taskIdGenerator =
    options.taskIdGenerator ??
    ({
      generateTaskId: () => {
        const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const randomPart = crypto.randomBytes(3).toString("hex");

        return `task_${datePart}_${randomPart}`;
      },
    } satisfies TaskIdGenerator);

  function getTaskQueue(queueName: string) {
    if (taskQueue) {
      return taskQueue;
    }

    if (!redisConnection) {
      redisConnection = new IORedis(
        options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        {
          maxRetriesPerRequest: null,
        },
      );
    }

    const existingTaskQueue = bullMqTaskQueues.get(queueName);

    if (existingTaskQueue) {
      return existingTaskQueue;
    }

    const queue = new Queue(queueName, {
      connection: redisConnection,
    });
    const mappedTaskQueue = createBullMqTaskQueue({
      queue,
    });
    bullMqQueues.set(queueName, queue);
    bullMqTaskQueues.set(queueName, mappedTaskQueue);

    return mappedTaskQueue;
  }

  const queuedTaskGateway: TaskQueue = {
    enqueue(input) {
      return getTaskQueue(input.queueName).enqueue(input);
    },
  };

  const createCharacterSheetsGenerateTask = createCreateCharacterSheetsGenerateTaskUseCase({
    projectRepository: repository,
    masterPlotStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createSceneSheetsGenerateTask = createCreateSceneSheetsGenerateTaskUseCase({
    projectRepository: repository,
    masterPlotStorage,
    characterSheetRepository,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });

  const createMasterPlotGenerateTask = createCreateMasterPlotGenerateTaskUseCase({
    projectRepository: repository,
    premiseStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });

  const createStoryboardGenerateTask = createCreateStoryboardGenerateTaskUseCase({
    projectRepository: repository,
    masterPlotStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createShotScriptGenerateTask = createCreateShotScriptGenerateTaskUseCase({
    projectRepository: repository,
    storyboardStorage,
    masterPlotStorage,
    characterSheetRepository,
    characterSheetStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createImagesGenerateTask = createCreateImagesGenerateTaskUseCase({
    projectRepository: repository,
    shotScriptStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createVideosGenerateTask = createCreateVideosGenerateTaskUseCase({
    projectRepository: repository,
    shotImageRepository,
    shotScriptStorage,
    storyboardStorage,
    masterPlotStorage,
    characterSheetRepository,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createFinalCutGenerateTask = createCreateFinalCutGenerateTaskUseCase({
    projectRepository: repository,
    videoRepository,
    taskRepository,
    taskFileStorage,
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    clock,
  });
  const createImageBatchGenerateAllFramesTask =
    createCreateImageBatchGenerateAllFramesTaskUseCase({
      projectRepository: repository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    });
  const createImageBatchRegenerateFailedFramesTask =
    createCreateImageBatchRegenerateFailedFramesTaskUseCase({
      projectRepository: repository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    });
  const createImageBatchRegenerateAllPromptsTask =
    createCreateImageBatchRegenerateAllPromptsTaskUseCase({
      projectRepository: repository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    });
  const createImageBatchRegenerateFailedPromptsTask =
    createCreateImageBatchRegenerateFailedPromptsTaskUseCase({
      projectRepository: repository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    });
  return {
    db,
    async close() {
      await Promise.all(Array.from(bullMqQueues.values()).map((queue) => queue.close()));
      await redisConnection?.quit();
      db.close();
    },
    createProject: createCreateProjectUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      idGenerator: {
        generateProjectId: () => {
          const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
          const randomPart = crypto.randomBytes(3).toString("hex");

          return `proj_${datePart}_${randomPart}`;
        },
      },
      clock,
    }),
    listProjects: createListProjectsUseCase({
      repository,
      masterPlotStorage,
      storyboardStorage,
      shotScriptStorage,
      characterSheetRepository,
      sceneSheetRepository,
      shotImageRepository,
      videoRepository,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      storyboardStorage,
      shotScriptStorage,
      characterSheetRepository,
      sceneSheetRepository,
      shotImageRepository,
      videoRepository,
    }),
    listCharacterSheets: createListCharacterSheetsUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
    }),
    listSceneSheets: createListSceneSheetsUseCase({
      projectRepository: repository,
      sceneSheetRepository,
    }),
    addCharacterSheetReferenceImages: createAddCharacterSheetReferenceImagesUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
      clock,
    }),
    deleteCharacterSheetReferenceImage: createDeleteCharacterSheetReferenceImageUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
    }),
    getCharacterSheet: createGetCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
    }),
    getCharacterSheetImageContent: createGetCharacterSheetImageContentUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
    }),
    getCharacterSheetReferenceImageContent: createGetCharacterSheetReferenceImageContentUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
    }),
    getCurrentStoryboard: createGetCurrentStoryboardUseCase({
      storyboardStorage,
      projectRepository: repository,
    }),
    getCurrentShotScript: createGetCurrentShotScriptUseCase({
      shotScriptStorage,
      projectRepository: repository,
    }),
    listImages: createListImagesUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      shotImageRepository,
      shotImageStorage,
    }),
    listVideos: createListVideosUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotImageRepository,
      videoStorage,
      videoPromptProvider,
      videoRepository,
    }),
    getFinalCut: createGetFinalCutUseCase({
      projectRepository: repository,
      videoRepository,
    }),
    getImageFrame: createGetImageFrameUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      shotImageRepository,
      shotImageStorage,
    }),
    getVideo: createGetVideoUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotImageRepository,
      videoStorage,
      videoPromptProvider,
      videoRepository,
    }),
    getImageFrameContent: createGetImageFrameContentUseCase({
      projectRepository: repository,
      shotImageRepository,
      shotImageStorage,
    }),
    getProjectAssetContent: createGetProjectAssetContentUseCase({
      projectRepository: repository,
      shotImageStorage,
    }),
    getMasterPlotReview: createGetMasterPlotReviewUseCase({
      projectRepository: repository,
      masterPlotStorage,
      taskRepository,
    }),
    getStoryboardReview: createGetStoryboardReviewUseCase({
      projectRepository: repository,
      storyboardStorage,
      taskRepository,
    }),
    getShotScriptReview: createGetShotScriptReviewUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotScriptReviewRepository,
      taskRepository,
    }),
    updateProjectScript: createUpdateProjectScriptUseCase({
      repository,
      premiseStorage,
      clock,
    }),
    resetProjectPremise: createResetProjectPremiseUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      clock,
    }),
    saveHumanMasterPlot: createSaveHumanMasterPlotUseCase({
      projectRepository: repository,
      masterPlotStorage,
      clock,
    }),
    saveHumanStoryboardVersion: createSaveHumanStoryboardVersionUseCase({
      projectRepository: repository,
      storyboardStorage,
      clock,
    }),
    saveHumanShotScriptSegment: createSaveHumanShotScriptSegmentUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
      shotScriptStorage,
      clock,
    }),
    approveMasterPlot: createApproveMasterPlotUseCase({
      projectRepository: repository,
      masterPlotStorage,
      clock,
    }),
    approveStoryboard: createApproveStoryboardUseCase({
      projectRepository: repository,
      storyboardStorage,
      clock,
    }),
    approveShotScriptSegment: createApproveShotScriptSegmentUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotScriptReviewRepository,
      clock,
    }),
    approveAllShotScriptSegments: createApproveAllShotScriptSegmentsUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotScriptReviewRepository,
      clock,
    }),
    rejectMasterPlot: createRejectMasterPlotUseCase({
      projectRepository: repository,
      masterPlotStorage,
      createMasterPlotGenerateTask,
    }),
    rejectStoryboard: createRejectStoryboardUseCase({
      projectRepository: repository,
      storyboardStorage,
      createStoryboardGenerateTask,
    }),
    regenerateMasterPlot: createRegenerateMasterPlotUseCase({
      projectRepository: repository,
      createMasterPlotGenerateTask,
      clock,
    }),
    regenerateCharacterSheets: createRegenerateCharacterSheetsUseCase({
      projectRepository: repository,
      createCharacterSheetsGenerateTask,
      clock,
    }),
    regenerateStoryboard: createRegenerateStoryboardUseCase({
      projectRepository: repository,
      createStoryboardGenerateTask,
      clock,
    }),
    regenerateShotScript: createRegenerateShotScriptUseCase({
      projectRepository: repository,
      createShotScriptGenerateTask,
      clock,
    }),
    regenerateImages: createRegenerateImagesUseCase({
      projectRepository: repository,
      createImagesGenerateTask,
      clock,
    }),
    regenerateVideoSegment: createRegenerateVideoSegmentUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotImageRepository,
      videoRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateShotScriptSegment: createRegenerateShotScriptSegmentUseCase({
      projectRepository: repository,
      storyboardStorage,
      shotScriptStorage,
      shotScriptReviewRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    updateCharacterSheetPrompt: createUpdateCharacterSheetPromptUseCase({
      projectRepository: repository,
      characterSheetRepository,
      clock,
    }),
    updateSceneSheetPrompt: createUpdateSceneSheetPromptUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      clock,
    }),
    updateFramePrompt: createUpdateFramePromptUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      shotImageRepository,
      shotImageStorage,
      clock,
    }),
    updateVideoPrompt: createUpdateVideoPromptUseCase({
      projectRepository: repository,
      videoRepository,
      clock,
    }),
    saveSegmentVideoConfig: createSaveSegmentVideoConfigUseCase({
      projectRepository: repository,
      videoRepository,
      clock,
    }),
    uploadSegmentVideoAudio: createUploadSegmentVideoAudioUseCase({
      projectRepository: repository,
      videoRepository,
      videoStorage,
      clock,
    }),
    regenerateCharacterSheet: createRegenerateCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateSceneSheet: createRegenerateSceneSheetUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateFramePrompt: createRegenerateFramePromptUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateVideoPrompt: createRegenerateVideoPromptUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      clock,
    }),
    regenerateAllVideoPrompts: createRegenerateAllVideoPromptsUseCase({
      projectRepository: repository,
      shotScriptStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      clock,
    }),
    regenerateAllFramePrompts: createRegenerateAllFramePromptsUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateFailedFramePrompts: createRegenerateFailedFramePromptsUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateUnfinishedFramePrompts: createRegenerateUnfinishedFramePromptsUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    regenerateFailedFrameImages: createRegenerateFailedFrameImagesUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    generateFrameImage: createGenerateFrameImageUseCase({
      projectRepository: repository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: queuedTaskGateway,
      taskIdGenerator,
      clock,
    }),
    approveCharacterSheet: createApproveCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
      clock,
    }),
    approveSceneSheet: createApproveSceneSheetUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      clock,
    }),
    approveImageFrame: createApproveImageFrameUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      shotImageRepository,
      shotImageStorage,
      clock,
    }),
    approveVideoSegment: createApproveVideoSegmentUseCase({
      projectRepository: repository,
      videoRepository,
      clock,
    }),
    approveAllImageFrames: createApproveAllImageFramesUseCase({
      projectRepository: repository,
      sceneSheetRepository,
      shotImageRepository,
      shotImageStorage,
      clock,
    }),
    approveAllVideoSegments: createApproveAllVideoSegmentsUseCase({
      projectRepository: repository,
      videoRepository,
      clock,
    }),
    createMasterPlotGenerateTask,
    createCharacterSheetsGenerateTask,
    createSceneSheetsGenerateTask,
    createStoryboardGenerateTask,
    createShotScriptGenerateTask,
    createImagesGenerateTask,
    createImageBatchGenerateAllFramesTask,
    createImageBatchRegenerateFailedFramesTask,
    createImageBatchRegenerateAllPromptsTask,
    createImageBatchRegenerateFailedPromptsTask,
    createVideosGenerateTask,
    createFinalCutGenerateTask,
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
