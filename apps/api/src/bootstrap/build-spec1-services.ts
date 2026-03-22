import crypto from "node:crypto";

import {
  createCreateMasterPlotGenerateTaskUseCase,
  createApproveCharacterSheetUseCase,
  createApproveMasterPlotUseCase,
  createApproveStoryboardUseCase,
  createCreateCharacterSheetsGenerateTaskUseCase,
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createGetCharacterSheetUseCase,
  createGetCurrentStoryboardUseCase,
  createGetMasterPlotReviewUseCase,
  createGetProjectDetailUseCase,
  createGetStoryboardReviewUseCase,
  createGetTaskDetailUseCase,
  createListCharacterSheetsUseCase,
  createListProjectsUseCase,
  createRegenerateCharacterSheetUseCase,
  createRejectMasterPlotUseCase,
  createRejectStoryboardUseCase,
  createSaveHumanMasterPlotUseCase,
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
  createSqliteTaskRepository,
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
  const characterSheetRepository = createSqliteCharacterSheetRepository({ db });
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
      characterSheetRepository,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      masterPlotStorage,
      storyboardStorage,
      characterSheetRepository,
    }),
    listCharacterSheets: createListCharacterSheetsUseCase({
      projectRepository: repository,
      characterSheetRepository,
    }),
    getCharacterSheet: createGetCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
    }),
    getCurrentStoryboard: createGetCurrentStoryboardUseCase({
      storyboardStorage,
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
    updateCharacterSheetPrompt: createUpdateCharacterSheetPromptUseCase({
      projectRepository: repository,
      characterSheetRepository,
      clock,
    }),
    regenerateCharacterSheet: createRegenerateCharacterSheetUseCase({
      projectRepository: repository,
      characterSheetRepository,
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
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
