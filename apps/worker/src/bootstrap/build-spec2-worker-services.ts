import crypto from "node:crypto";

import {
  createProcessCharacterSheetGenerateTaskUseCase,
  createProcessCharacterSheetsGenerateTaskUseCase,
  createProcessStoryboardGenerateTaskUseCase,
  type CharacterSheetImageProvider,
  type CharacterSheetPromptProvider,
  type CharacterSheetRepository,
  type CharacterSheetStorage,
  type Clock,
  type MasterPlotStorage,
  type ProcessCharacterSheetGenerateTaskUseCase,
  type ProcessCharacterSheetsGenerateTaskUseCase,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type StoryboardProvider,
  type StoryboardStorage,
  type TaskFileStorage,
  type TaskIdGenerator,
  type TaskQueue,
  type TaskRepository,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createCharacterSheetStorage,
  createGeminiCharacterSheetProvider,
  createGeminiStoryboardProvider,
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
  createTaskFileStorage,
  createTurnaroundImageProvider,
  initializeSqliteSchema,
} from "@sweet-star/services";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface BuildSpec2WorkerServicesOptions {
  workspaceRoot?: string;
  projectRepository?: ProjectRepository;
  taskRepository?: TaskRepository;
  taskFileStorage?: TaskFileStorage;
  masterPlotStorage?: MasterPlotStorage;
  storyboardStorage?: StoryboardStorage;
  characterSheetRepository?: CharacterSheetRepository;
  characterSheetStorage?: CharacterSheetStorage;
  storyboardProvider?: StoryboardProvider;
  characterSheetPromptProvider?: CharacterSheetPromptProvider;
  characterSheetImageProvider?: CharacterSheetImageProvider;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  clock?: Clock;
}

export interface Spec2WorkerServices {
  processStoryboardGenerateTask: ProcessStoryboardGenerateTaskUseCase;
  processCharacterSheetsGenerateTask: ProcessCharacterSheetsGenerateTaskUseCase;
  processCharacterSheetGenerateTask: ProcessCharacterSheetGenerateTaskUseCase;
  close(): Promise<void>;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  const paths = options.workspaceRoot ? createLocalDataPaths(options.workspaceRoot) : null;
  const db = paths ? createSqliteDb({ paths }) : null;
  const defaultStoryboardStorage = paths ? createStoryboardStorage({ paths }) : null;
  const defaultCharacterSheetStorage = paths ? createCharacterSheetStorage({ paths }) : null;

  if (db) {
    initializeSqliteSchema(db);
  }

  const taskRepository =
    options.taskRepository ?? (db ? createSqliteTaskRepository({ db }) : null);
  const projectRepository =
    options.projectRepository ?? (db ? createSqliteProjectRepository({ db }) : null);
  const taskFileStorage =
    options.taskFileStorage ?? (paths ? createTaskFileStorage({ paths }) : null);
  const storyboardStorage = options.storyboardStorage ?? defaultStoryboardStorage;
  const masterPlotStorage = options.masterPlotStorage ?? defaultStoryboardStorage;
  const characterSheetRepository =
    options.characterSheetRepository ?? (db ? createSqliteCharacterSheetRepository({ db }) : null);
  const characterSheetStorage = options.characterSheetStorage ?? defaultCharacterSheetStorage;
  const storyboardProvider =
    options.storyboardProvider ??
    (process.env.VECTORENGINE_API_TOKEN?.trim()
      ? createGeminiStoryboardProvider({
          baseUrl: process.env.VECTORENGINE_BASE_URL,
          apiToken: process.env.VECTORENGINE_API_TOKEN,
          model: process.env.STORYBOARD_LLM_MODEL,
        })
      : {
          async generateStoryboard() {
            throw new Error("VECTORENGINE_API_TOKEN is required for storyboard generation");
          },
        });
  const characterSheetPromptProvider =
    options.characterSheetPromptProvider ??
    createGeminiCharacterSheetProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.CHARACTER_SHEET_PROMPT_MODEL,
    });
  const characterSheetImageProvider =
    options.characterSheetImageProvider ??
    createTurnaroundImageProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.CHARACTER_SHEET_IMAGE_MODEL,
    });
  const taskIdGenerator =
    options.taskIdGenerator ??
    ({
      generateTaskId() {
        const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const randomPart = crypto.randomBytes(3).toString("hex");

        return `task_${datePart}_${randomPart}`;
      },
    } satisfies TaskIdGenerator);

  let queueConnection: IORedis | null = null;
  const bullMqQueues = new Map<string, Queue>();
  const bullMqTaskQueues = new Map<string, TaskQueue>();
  const taskQueue: TaskQueue =
    options.taskQueue ??
    ({
      async enqueue(input) {
        if (!queueConnection) {
          queueConnection = new IORedis(
            options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
            {
              maxRetriesPerRequest: null,
            },
          );
        }

        const existingTaskQueue = bullMqTaskQueues.get(input.queueName);

        if (existingTaskQueue) {
          await existingTaskQueue.enqueue(input);
          return;
        }

        const queue = new Queue(input.queueName, {
          connection: queueConnection,
        });
        const mappedTaskQueue = createBullMqTaskQueue({
          queue,
        });
        bullMqQueues.set(input.queueName, queue);
        bullMqTaskQueues.set(input.queueName, mappedTaskQueue);
        await mappedTaskQueue.enqueue(input);
      },
    } satisfies TaskQueue);

  if (
    !taskRepository ||
    !projectRepository ||
    !taskFileStorage ||
    !masterPlotStorage ||
    !storyboardStorage ||
    !characterSheetRepository ||
    !characterSheetStorage
  ) {
    throw new Error(
      "buildSpec2WorkerServices requires either workspaceRoot or explicit task dependencies",
    );
  }

  return {
    processStoryboardGenerateTask: createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      storyboardProvider,
      masterPlotStorage,
      storyboardStorage,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processCharacterSheetsGenerateTask: createProcessCharacterSheetsGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotStorage,
      characterSheetRepository,
      characterSheetStorage,
      characterSheetPromptProvider,
      taskQueue,
      taskIdGenerator,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processCharacterSheetGenerateTask: createProcessCharacterSheetGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      characterSheetRepository,
      characterSheetStorage,
      characterSheetImageProvider,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    async close() {
      await Promise.all(Array.from(bullMqQueues.values()).map((queue) => queue.close()));
      await queueConnection?.quit();
      db?.close();
    },
  };
}
