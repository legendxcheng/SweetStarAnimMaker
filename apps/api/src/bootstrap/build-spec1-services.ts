import crypto from "node:crypto";

import {
  createApproveStoryboardUseCase,
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createGetCurrentStoryboardUseCase,
  createGetProjectDetailUseCase,
  createGetStoryboardReviewUseCase,
  createGetTaskDetailUseCase,
  createRejectStoryboardUseCase,
  createSaveHumanStoryboardVersionUseCase,
  storyboardGenerateQueueName,
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
  const scriptStorage = createFileScriptStorage({ paths });
  const taskRepository = createSqliteTaskRepository({ db });
  const taskFileStorage = createTaskFileStorage({ paths });
  const storyboardVersionRepository = createSqliteStoryboardVersionRepository({ db });
  const storyboardReviewRepository = createSqliteStoryboardReviewRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });
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
      scriptStorage,
      idGenerator: {
        generateProjectId: () => {
          const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
          const randomPart = crypto.randomBytes(3).toString("hex");

          return `proj_${datePart}_${randomPart}`;
        },
      },
      clock,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
      storyboardVersionRepository,
    }),
    getCurrentStoryboard: createGetCurrentStoryboardUseCase({
      storyboardVersionRepository,
      storyboardStorage,
    }),
    getStoryboardReview: createGetStoryboardReviewUseCase({
      projectRepository: repository,
      storyboardVersionRepository,
      storyboardStorage,
      storyboardReviewRepository,
      taskRepository,
    }),
    updateProjectScript: createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock,
    }),
    saveHumanStoryboardVersion: createSaveHumanStoryboardVersionUseCase({
      projectRepository: repository,
      storyboardVersionRepository,
      storyboardStorage,
      clock,
    }),
    approveStoryboard: createApproveStoryboardUseCase({
      projectRepository: repository,
      storyboardVersionRepository,
      storyboardReviewRepository,
      clock,
    }),
    rejectStoryboard: createRejectStoryboardUseCase({
      projectRepository: repository,
      storyboardVersionRepository,
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
