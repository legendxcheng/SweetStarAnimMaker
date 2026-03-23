import crypto from "node:crypto";

import {
  createApproveAllShotScriptSegmentsUseCase,
  createApproveCharacterSheetUseCase,
  createApproveMasterPlotUseCase,
  createApproveShotScriptSegmentUseCase,
  createApproveStoryboardUseCase,
  createCreateMasterPlotGenerateTaskUseCase,
  createCreateCharacterSheetsGenerateTaskUseCase,
  createCreateShotScriptGenerateTaskUseCase,
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createAddCharacterSheetReferenceImagesUseCase,
  createDeleteCharacterSheetReferenceImageUseCase,
  createGetCharacterSheetImageContentUseCase,
  createGetCharacterSheetUseCase,
  createGetCharacterSheetReferenceImageContentUseCase,
  createGetCurrentShotScriptUseCase,
  createGetCurrentStoryboardUseCase,
  createGetMasterPlotReviewUseCase,
  createGetProjectDetailUseCase,
  createGetShotScriptReviewUseCase,
  createGetStoryboardReviewUseCase,
  createGetTaskDetailUseCase,
  createListCharacterSheetsUseCase,
  createListProjectsUseCase,
  createRegenerateShotScriptSegmentUseCase,
  createRegenerateCharacterSheetUseCase,
  createRejectMasterPlotUseCase,
  createRejectStoryboardUseCase,
  createSaveHumanMasterPlotUseCase,
  createSaveHumanShotScriptSegmentUseCase,
  createSaveHumanStoryboardVersionUseCase,
  createUpdateCharacterSheetPromptUseCase,
  createUpdateProjectScriptUseCase,
  type TaskIdGenerator,
  type TaskQueue,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createCharacterSheetStorage,
  createFileScriptStorage,
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotScriptReviewRepository,
  createSqliteTaskRepository,
  createShotScriptStorage,
  createStoryboardStorage,
  createTaskFileStorage,
  initializeSqliteSchema,
} from "@sweet-star/services";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface BuildSpec1ServicesOptions {
  workspaceRoot: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
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
  const shotScriptReviewRepository = createSqliteShotScriptReviewRepository({ db });
  const characterSheetStorage = createCharacterSheetStorage({ paths });
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
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      storyboardStorage,
      shotScriptStorage,
      characterSheetRepository,
    }),
    listCharacterSheets: createListCharacterSheetsUseCase({
      projectRepository: repository,
      characterSheetRepository,
      characterSheetStorage,
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
    approveCharacterSheet: createApproveCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
      clock,
    }),
    createMasterPlotGenerateTask,
    createCharacterSheetsGenerateTask,
    createStoryboardGenerateTask,
    createShotScriptGenerateTask,
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
