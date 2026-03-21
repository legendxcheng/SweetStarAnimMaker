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
  createUpdateProjectScriptUseCase,
  storyboardGenerateQueueName,
  type TaskIdGenerator,
  type TaskQueue,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createFileScriptStorage,
  createLocalDataPaths,
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
    bullMqQueue = new Queue(storyboardGenerateQueueName, {
      connection: redisConnection,
    });
    taskQueue = createBullMqTaskQueue({
      queue: bullMqQueue,
    });

    return taskQueue;
  }

  const createStoryboardGenerateTask = createCreateStoryboardGenerateTaskUseCase({
    projectRepository: repository,
    masterPlotStorage,
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
      masterPlotStorage,
      storyboardStorage,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      masterPlotStorage,
      storyboardStorage,
    }),
    getCurrentStoryboard: createGetCurrentStoryboardUseCase({
      storyboardStorage,
      projectRepository: repository,
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
    saveHumanStoryboardVersion: createSaveHumanStoryboardVersionUseCase({
      projectRepository: repository,
      storyboardStorage,
      clock,
    }),
    approveStoryboard: createApproveStoryboardUseCase({
      projectRepository: repository,
      storyboardStorage,
      clock,
    }),
    rejectStoryboard: createRejectStoryboardUseCase({
      projectRepository: repository,
      storyboardStorage,
      createStoryboardGenerateTask,
    }),
    createStoryboardGenerateTask,
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
