import crypto from "node:crypto";

import {
  createCreateStoryboardGenerateTaskUseCase,
  createCreateProjectUseCase,
  createGetProjectDetailUseCase,
  createGetTaskDetailUseCase,
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
  createSqliteTaskRepository,
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
    );
    bullMqQueue = new Queue(storyboardGenerateQueueName, {
      connection: redisConnection,
    });
    taskQueue = createBullMqTaskQueue({
      queue: bullMqQueue,
    });

    return taskQueue;
  }

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
    }),
    updateProjectScript: createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock,
    }),
    createStoryboardGenerateTask: createCreateStoryboardGenerateTaskUseCase({
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
    }),
    getTaskDetail: createGetTaskDetailUseCase({
      repository: taskRepository,
    }),
  };
}
