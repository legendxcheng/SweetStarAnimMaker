import crypto from "node:crypto";

import {
  createApproveStoryboardUseCase,
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createGetCurrentStoryboardUseCase,
  createGetProjectDetailUseCase,
  createGetStoryboardReviewUseCase,
  createGetTaskDetailUseCase,
  createListProjectsUseCase,
  createRejectStoryboardUseCase,
  createSaveHumanStoryboardVersionUseCase,
  masterPlotGenerateQueueName,
  createUpdateProjectScriptUseCase,
  type TaskIdGenerator,
  type TaskQueue,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createFileScriptStorage,
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardReviewRepository,
  createSqliteStoryboardVersionRepository,
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
  const storyboardVersionRepository = createSqliteStoryboardVersionRepository({ db });
  const storyboardReviewRepository = createSqliteStoryboardReviewRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });
  const masterPlotStorage = storyboardStorage;
  const clock = {
    now: () => new Date().toISOString(),
  };
  let redisConnection: IORedis | null = null;
  let bullMqQueue: Queue | null = null;
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

  function getTaskQueue() {
    if (taskQueue) {
      return taskQueue;
    }

    redisConnection = new IORedis(
      options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
      {
        maxRetriesPerRequest: null,
      },
    );
    bullMqQueue = new Queue(masterPlotGenerateQueueName, {
      connection: redisConnection,
    });
    taskQueue = createBullMqTaskQueue({
      queue: bullMqQueue,
    });

    return taskQueue;
  }

  const createStoryboardGenerateTask = createCreateStoryboardGenerateTaskUseCase({
    projectRepository: repository,
    premiseStorage,
    taskRepository,
    taskFileStorage,
    taskQueue: {
      enqueue(input) {
        return getTaskQueue().enqueue(input);
      },
    },
    taskIdGenerator,
    clock,
  });

  return {
    db,
    async close() {
      await bullMqQueue?.close();
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
      storyboardVersionRepository,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      masterPlotStorage,
    }),
    getCurrentStoryboard: createGetCurrentStoryboardUseCase({
      storyboardVersionRepository,
      storyboardStorage,
    }),
    getStoryboardReview: createGetStoryboardReviewUseCase({
      projectRepository: repository,
      masterPlotStorage,
      storyboardReviewRepository,
      taskRepository,
    }),
    updateProjectScript: createUpdateProjectScriptUseCase({
      repository,
      premiseStorage,
      clock,
    }),
    saveHumanStoryboardVersion: createSaveHumanStoryboardVersionUseCase({
      projectRepository: repository,
      masterPlotStorage,
      clock,
    }),
    approveStoryboard: createApproveStoryboardUseCase({
      projectRepository: repository,
      masterPlotStorage,
      storyboardReviewRepository,
      clock,
    }),
    rejectStoryboard: createRejectStoryboardUseCase({
      projectRepository: repository,
      masterPlotStorage,
      storyboardReviewRepository,
      createStoryboardGenerateTask,
      clock,
    }),
    createStoryboardGenerateTask,
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
