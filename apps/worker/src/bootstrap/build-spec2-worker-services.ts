import crypto from "node:crypto";

import {
  createProcessFrameImageGenerateTaskUseCase,
  createProcessFramePromptGenerateTaskUseCase,
  createProcessImagesGenerateTaskUseCase,
  createProcessMasterPlotGenerateTaskUseCase,
  createProcessCharacterSheetGenerateTaskUseCase,
  createProcessCharacterSheetsGenerateTaskUseCase,
  createProcessShotScriptGenerateTaskUseCase,
  createProcessShotScriptSegmentGenerateTaskUseCase,
  createProcessStoryboardGenerateTaskUseCase,
  type FramePromptProvider,
  type ProcessShotScriptSegmentGenerateTaskUseCase,
  type CharacterSheetImageProvider,
  type CharacterSheetPromptProvider,
  type CharacterSheetRepository,
  type CharacterSheetStorage,
  type Clock,
  type MasterPlotProvider,
  type MasterPlotStorage,
  type ProcessMasterPlotGenerateTaskUseCase,
  type ProcessCharacterSheetGenerateTaskUseCase,
  type ProcessCharacterSheetsGenerateTaskUseCase,
  type ProcessFrameImageGenerateTaskUseCase,
  type ProcessFramePromptGenerateTaskUseCase,
  type ProcessImagesGenerateTaskUseCase,
  type ProcessShotScriptGenerateTaskUseCase,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type ShotImageProvider,
  type ShotImageRepository,
  type ShotImageStorage,
  type StoryboardProvider,
  type StoryboardStorage,
  type ShotScriptProvider,
  type ShotScriptStorage,
  type TaskFileStorage,
  type TaskIdGenerator,
  type TaskQueue,
  type TaskRepository,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createCharacterSheetStorage,
  createGeminiFramePromptProvider,
  createGeminiCharacterSheetProvider,
  createGeminiShotScriptProvider,
  createGeminiStoryboardProvider,
  createLocalDataPaths,
  createReferenceImageUploader,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotImageRepository,
  createSqliteTaskRepository,
  createShotImageStorage,
  createShotScriptStorage,
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
  shotScriptStorage?: ShotScriptStorage;
  characterSheetRepository?: CharacterSheetRepository;
  characterSheetStorage?: CharacterSheetStorage;
  shotImageRepository?: ShotImageRepository;
  shotImageStorage?: ShotImageStorage;
  masterPlotProvider?: MasterPlotProvider;
  storyboardProvider?: StoryboardProvider;
  shotScriptProvider?: ShotScriptProvider;
  characterSheetPromptProvider?: CharacterSheetPromptProvider;
  characterSheetImageProvider?: CharacterSheetImageProvider;
  framePromptProvider?: FramePromptProvider;
  shotImageProvider?: ShotImageProvider;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  clock?: Clock;
}

export interface Spec2WorkerServices {
  processMasterPlotGenerateTask: ProcessMasterPlotGenerateTaskUseCase;
  processStoryboardGenerateTask: ProcessStoryboardGenerateTaskUseCase;
  processShotScriptGenerateTask: ProcessShotScriptGenerateTaskUseCase;
  processShotScriptSegmentGenerateTask: ProcessShotScriptSegmentGenerateTaskUseCase;
  processCharacterSheetsGenerateTask: ProcessCharacterSheetsGenerateTaskUseCase;
  processCharacterSheetGenerateTask: ProcessCharacterSheetGenerateTaskUseCase;
  processImagesGenerateTask: ProcessImagesGenerateTaskUseCase;
  processFramePromptGenerateTask: ProcessFramePromptGenerateTaskUseCase;
  processFrameImageGenerateTask: ProcessFrameImageGenerateTaskUseCase;
  close(): Promise<void>;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  const paths = options.workspaceRoot ? createLocalDataPaths(options.workspaceRoot) : null;
  const db = paths ? createSqliteDb({ paths }) : null;
  const defaultStoryboardStorage = paths ? createStoryboardStorage({ paths }) : null;
  const defaultShotScriptStorage = paths ? createShotScriptStorage({ paths }) : null;
  const defaultCharacterSheetStorage = paths ? createCharacterSheetStorage({ paths }) : null;
  const defaultShotImageStorage = paths ? createShotImageStorage({ paths }) : null;

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
  const shotScriptStorage =
    options.shotScriptStorage ?? defaultShotScriptStorage ?? createUnsupportedShotScriptStorage();
  const masterPlotStorage = options.masterPlotStorage ?? defaultStoryboardStorage;
  const characterSheetRepository =
    options.characterSheetRepository ?? (db ? createSqliteCharacterSheetRepository({ db }) : null);
  const characterSheetStorage = options.characterSheetStorage ?? defaultCharacterSheetStorage;
  const shotImageRepository =
    options.shotImageRepository ??
    (db ? createSqliteShotImageRepository({ db }) : createUnsupportedShotImageRepository());
  const shotImageStorage =
    options.shotImageStorage ?? defaultShotImageStorage ?? createUnsupportedShotImageStorage();
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
  const masterPlotProvider =
    options.masterPlotProvider ??
    (process.env.VECTORENGINE_API_TOKEN?.trim()
      ? createGeminiStoryboardProvider({
          baseUrl: process.env.VECTORENGINE_BASE_URL,
          apiToken: process.env.VECTORENGINE_API_TOKEN,
          model: process.env.STORYBOARD_LLM_MODEL,
        })
      : {
          async generateMasterPlot() {
            throw new Error("VECTORENGINE_API_TOKEN is required for master plot generation");
          },
        });
  const shotScriptProvider =
    options.shotScriptProvider ??
    (process.env.VECTORENGINE_API_TOKEN?.trim()
      ? createGeminiShotScriptProvider({
          baseUrl: process.env.VECTORENGINE_BASE_URL,
          apiToken: process.env.VECTORENGINE_API_TOKEN,
          model: process.env.SHOT_SCRIPT_LLM_MODEL,
        })
      : {
          async generateShotScriptSegment() {
            throw new Error("VECTORENGINE_API_TOKEN is required for shot script generation");
          },
        });
  const characterSheetPromptProvider =
    options.characterSheetPromptProvider ??
    createGeminiCharacterSheetProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.CHARACTER_SHEET_PROMPT_MODEL,
    });
  const referenceImageUploader = createReferenceImageUploader({
    providerOrder: process.env.IMAGE_UPLOAD_PROVIDER_ORDER?.split(","),
    picgoApiKey: process.env.PICGO_API_KEY,
  });
  const characterSheetImageProvider =
    options.characterSheetImageProvider ??
    createTurnaroundImageProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.CHARACTER_SHEET_IMAGE_MODEL,
      referenceImageUploader,
    });
  const framePromptProvider =
    options.framePromptProvider ??
    createGeminiFramePromptProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.FRAME_PROMPT_MODEL,
    });
  const shotImageProvider =
    options.shotImageProvider ??
    createTurnaroundImageProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.FRAME_IMAGE_MODEL,
      referenceImageUploader,
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
    processMasterPlotGenerateTask: createProcessMasterPlotGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotProvider,
      masterPlotStorage,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
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
    processShotScriptGenerateTask: createProcessShotScriptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptProvider,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processShotScriptSegmentGenerateTask: createProcessShotScriptSegmentGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptProvider,
      shotScriptStorage,
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
    processImagesGenerateTask: createProcessImagesGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processFramePromptGenerateTask: createProcessFramePromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotScriptStorage,
      characterSheetRepository,
      characterSheetStorage,
      framePromptProvider,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processFrameImageGenerateTask: createProcessFrameImageGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotImageProvider,
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

function createUnsupportedShotScriptStorage(): ShotScriptStorage {
  return {
    async initializePromptTemplate() {},
    async readPromptTemplate() {
      throw new Error("Shot script storage is not configured");
    },
    async writePromptSnapshot() {},
    async writeRawResponse() {},
    async writeShotScriptVersion() {},
    async readShotScriptVersion() {
      throw new Error("Shot script storage is not configured");
    },
    async writeCurrentShotScript() {},
    async readCurrentShotScript() {
      return null;
    },
  };
}

function createUnsupportedShotImageRepository(): ShotImageRepository {
  return {
    insertBatch() {
      throw new Error("Shot image repository is not configured");
    },
    findBatchById() {
      throw new Error("Shot image repository is not configured");
    },
    findCurrentBatchByProjectId() {
      throw new Error("Shot image repository is not configured");
    },
    listFramesByBatchId() {
      throw new Error("Shot image repository is not configured");
    },
    insertFrame() {
      throw new Error("Shot image repository is not configured");
    },
    findFrameById() {
      throw new Error("Shot image repository is not configured");
    },
    updateFrame() {
      throw new Error("Shot image repository is not configured");
    },
  };
}

function createUnsupportedShotImageStorage(): ShotImageStorage {
  return {
    async writeBatchManifest() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePlanning() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePromptFiles() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePromptVersion() {
      throw new Error("Shot image storage is not configured");
    },
    async writeCurrentImage() {
      throw new Error("Shot image storage is not configured");
    },
    async writeImageVersion() {
      throw new Error("Shot image storage is not configured");
    },
    async readCurrentFrame() {
      throw new Error("Shot image storage is not configured");
    },
  };
}
