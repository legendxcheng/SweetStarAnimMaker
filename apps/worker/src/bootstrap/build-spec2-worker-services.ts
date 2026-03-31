import crypto from "node:crypto";

import {
  createProcessFrameImageGenerateTaskUseCase,
  createProcessImageBatchGenerateAllFramesTaskUseCase,
  createProcessImageBatchRegenerateAllPromptsTaskUseCase,
  createProcessImageBatchRegenerateFailedFramesTaskUseCase,
  createProcessImageBatchRegenerateFailedPromptsTaskUseCase,
  createProcessFinalCutGenerateTaskUseCase,
  createProcessFramePromptGenerateTaskUseCase,
  createProcessImagesGenerateTaskUseCase,
  createProcessMasterPlotGenerateTaskUseCase,
  createProcessSegmentVideoPromptGenerateTaskUseCase,
  createProcessSegmentVideoGenerateTaskUseCase,
  createProcessVideosGenerateTaskUseCase,
  type VideoPromptProvider,
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
  type FinalCutRenderer,
  type MasterPlotProvider,
  type MasterPlotStorage,
  type ProcessMasterPlotGenerateTaskUseCase,
  type ProcessCharacterSheetGenerateTaskUseCase,
  type ProcessCharacterSheetsGenerateTaskUseCase,
  type ProcessFinalCutGenerateTaskUseCase,
  type ProcessFrameImageGenerateTaskUseCase,
  type ProcessFramePromptGenerateTaskUseCase,
  type ProcessImageBatchGenerateAllFramesTaskUseCase,
  type ProcessImageBatchRegenerateAllPromptsTaskUseCase,
  type ProcessImageBatchRegenerateFailedFramesTaskUseCase,
  type ProcessImageBatchRegenerateFailedPromptsTaskUseCase,
  type ProcessImagesGenerateTaskUseCase,
  type ProcessSegmentVideoPromptGenerateTaskUseCase,
  type ProcessSegmentVideoGenerateTaskUseCase,
  type ProcessVideosGenerateTaskUseCase,
  type ProcessShotScriptGenerateTaskUseCase,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type ShotImageProvider,
  type ShotImageRepository,
  type ShotImageStorage,
  type VideoProvider,
  type VideoRepository,
  type VideoStorage,
  type StoryboardProvider,
  type StoryboardStorage,
  type ShotScriptProvider,
  type ShotScriptStorage,
  type TaskFileStorage,
  type TaskIdGenerator,
  type TaskQueue,
  type TaskRepository,
  createGenerateFrameImageUseCase,
  createRegenerateAllFramePromptsUseCase,
  createRegenerateFailedFrameImagesUseCase,
  createRegenerateFailedFramePromptsUseCase,
} from "@sweet-star/core";
import {
  createBullMqTaskQueue,
  createCharacterSheetStorage,
  createGeminiFramePromptProvider,
  createGeminiVideoPromptProvider,
  createGeminiCharacterSheetProvider,
  createGeminiShotScriptProvider,
  createGeminiStoryboardProvider,
  createGrokCharacterSheetProvider,
  createGrokFramePromptProvider,
  createGrokShotScriptProvider,
  createGrokStoryboardProvider,
  createGrokVideoPromptProvider,
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
  createVideoStorage,
  createFfmpegFinalCutRenderer,
  createVideoPromptProviderWithGrokFallback,
  initializeSqliteSchema,
  createSqliteVideoRepository,
} from "@sweet-star/services";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createConfiguredVideoProvider } from "./video-provider-config";

const DEFAULT_LANDSCAPE_IMAGE_SIZE = "2848x1600";

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
  videoRepository?: VideoRepository;
  videoStorage?: VideoStorage;
  masterPlotProvider?: MasterPlotProvider;
  storyboardProvider?: StoryboardProvider;
  shotScriptProvider?: ShotScriptProvider;
  characterSheetPromptProvider?: CharacterSheetPromptProvider;
  characterSheetImageProvider?: CharacterSheetImageProvider;
  framePromptProvider?: FramePromptProvider;
  videoPromptProvider?: VideoPromptProvider;
  shotImageProvider?: ShotImageProvider;
  videoProvider?: VideoProvider;
  finalCutRenderer?: FinalCutRenderer;
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
  processImageBatchGenerateAllFramesTask: ProcessImageBatchGenerateAllFramesTaskUseCase;
  processImageBatchRegenerateFailedFramesTask: ProcessImageBatchRegenerateFailedFramesTaskUseCase;
  processImageBatchRegenerateAllPromptsTask: ProcessImageBatchRegenerateAllPromptsTaskUseCase;
  processImageBatchRegenerateFailedPromptsTask: ProcessImageBatchRegenerateFailedPromptsTaskUseCase;
  processVideosGenerateTask: ProcessVideosGenerateTaskUseCase;
  processFinalCutGenerateTask: ProcessFinalCutGenerateTaskUseCase;
  processSegmentVideoPromptGenerateTask: ProcessSegmentVideoPromptGenerateTaskUseCase;
  processSegmentVideoGenerateTask: ProcessSegmentVideoGenerateTaskUseCase;
  processFramePromptGenerateTask: ProcessFramePromptGenerateTaskUseCase;
  processFrameImageGenerateTask: ProcessFrameImageGenerateTaskUseCase;
  close(): Promise<void>;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  const defaultLandscapeImageSize =
    process.env.FRAME_IMAGE_SIZE?.trim() || DEFAULT_LANDSCAPE_IMAGE_SIZE;
  const paths = options.workspaceRoot ? createLocalDataPaths(options.workspaceRoot) : null;
  const db = paths ? createSqliteDb({ paths }) : null;
  const defaultStoryboardStorage = paths ? createStoryboardStorage({ paths }) : null;
  const defaultShotScriptStorage = paths ? createShotScriptStorage({ paths }) : null;
  const defaultCharacterSheetStorage = paths ? createCharacterSheetStorage({ paths }) : null;
  const defaultShotImageStorage = paths ? createShotImageStorage({ paths }) : null;
  const defaultVideoStorage = paths ? createVideoStorage({ paths }) : null;

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
  const videoRepository =
    options.videoRepository ??
    (db ? createSqliteVideoRepository({ db }) : createUnsupportedVideoRepository());
  const shotImageStorage =
    options.shotImageStorage ?? defaultShotImageStorage ?? createUnsupportedShotImageStorage();
  const videoStorage = options.videoStorage ?? defaultVideoStorage ?? createUnsupportedVideoStorage();
  const defaultStoryboardTextProvider = process.env.VECTORENGINE_API_TOKEN?.trim()
    ? createStoryboardProviderWithGrokFallback(
        createGeminiStoryboardProvider({
          baseUrl: process.env.VECTORENGINE_BASE_URL,
          apiToken: process.env.VECTORENGINE_API_TOKEN,
          model: process.env.STORYBOARD_LLM_MODEL,
        }),
        createGrokStoryboardProvider({
          baseUrl: process.env.VECTORENGINE_BASE_URL,
          apiToken: process.env.VECTORENGINE_API_TOKEN,
          model: process.env.STORYBOARD_GROK_MODEL,
        }),
      )
    : null;
  const storyboardProvider =
    options.storyboardProvider ??
    (defaultStoryboardTextProvider
      ? defaultStoryboardTextProvider
      : {
          async generateStoryboard() {
            throw new Error("VECTORENGINE_API_TOKEN is required for storyboard generation");
          },
        });
  const masterPlotProvider =
    options.masterPlotProvider ??
    (defaultStoryboardTextProvider
      ? defaultStoryboardTextProvider
      : {
          async generateMasterPlot() {
            throw new Error("VECTORENGINE_API_TOKEN is required for master plot generation");
          },
        });
  const shotScriptProvider =
    options.shotScriptProvider ??
    (process.env.VECTORENGINE_API_TOKEN?.trim()
      ? createShotScriptProviderWithGrokFallback(
          createGeminiShotScriptProvider({
            baseUrl: process.env.VECTORENGINE_BASE_URL,
            apiToken: process.env.VECTORENGINE_API_TOKEN,
            model: process.env.SHOT_SCRIPT_LLM_MODEL,
          }),
          createGrokShotScriptProvider({
            baseUrl: process.env.VECTORENGINE_BASE_URL,
            apiToken: process.env.VECTORENGINE_API_TOKEN,
            model: process.env.SHOT_SCRIPT_GROK_MODEL,
          }),
        )
      : {
          async generateShotScriptSegment() {
            throw new Error("VECTORENGINE_API_TOKEN is required for shot script generation");
          },
        });
  const characterSheetPromptProvider =
    options.characterSheetPromptProvider ??
    createCharacterSheetPromptProviderWithGrokFallback(
      createGeminiCharacterSheetProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.CHARACTER_SHEET_PROMPT_MODEL,
      }),
      createGrokCharacterSheetProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.CHARACTER_SHEET_PROMPT_GROK_MODEL,
      }),
    );
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
      size: defaultLandscapeImageSize,
      referenceImageUploader,
    });
  const framePromptProvider =
    options.framePromptProvider ??
    createFramePromptProviderWithGrokFallback(
      createGeminiFramePromptProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.FRAME_PROMPT_MODEL,
      }),
      createGrokFramePromptProvider({
        baseUrl: process.env.VECTORENGINE_BASE_URL,
        apiToken: process.env.VECTORENGINE_API_TOKEN,
        model: process.env.FRAME_PROMPT_GROK_MODEL,
      }),
    );
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
  const shotImageProvider =
    options.shotImageProvider ??
    createTurnaroundImageProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.FRAME_IMAGE_MODEL,
      size: defaultLandscapeImageSize,
      referenceImageUploader,
    });
  const videoProvider =
    options.videoProvider ??
    createConfiguredVideoProvider({
      env: process.env,
      referenceImageUploader,
    });
  const finalCutRenderer =
    options.finalCutRenderer ?? createFfmpegFinalCutRenderer();
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
    processImageBatchGenerateAllFramesTask:
      createProcessImageBatchGenerateAllFramesTaskUseCase({
        taskRepository,
        projectRepository,
        taskFileStorage,
        shotImageRepository,
        generateFrameImage: createGenerateFrameImageUseCase({
          projectRepository,
          shotImageRepository,
          taskRepository,
          taskFileStorage,
          taskQueue,
          taskIdGenerator,
          clock: options.clock ?? {
            now: () => new Date().toISOString(),
          },
        }),
        clock: options.clock ?? {
          now: () => new Date().toISOString(),
        },
      }),
    processImageBatchRegenerateFailedFramesTask:
      createProcessImageBatchRegenerateFailedFramesTaskUseCase({
        taskRepository,
        projectRepository,
        taskFileStorage,
        regenerateFailedFrameImages: createRegenerateFailedFrameImagesUseCase({
          projectRepository,
          shotImageRepository,
          taskRepository,
          taskFileStorage,
          taskQueue,
          taskIdGenerator,
          clock: options.clock ?? {
            now: () => new Date().toISOString(),
          },
        }),
        clock: options.clock ?? {
          now: () => new Date().toISOString(),
        },
      }),
    processImageBatchRegenerateAllPromptsTask:
      createProcessImageBatchRegenerateAllPromptsTaskUseCase({
        taskRepository,
        projectRepository,
        taskFileStorage,
        regenerateAllFramePrompts: createRegenerateAllFramePromptsUseCase({
          projectRepository,
          shotImageRepository,
          taskRepository,
          taskFileStorage,
          taskQueue,
          taskIdGenerator,
          clock: options.clock ?? {
            now: () => new Date().toISOString(),
          },
        }),
        clock: options.clock ?? {
          now: () => new Date().toISOString(),
        },
      }),
    processImageBatchRegenerateFailedPromptsTask:
      createProcessImageBatchRegenerateFailedPromptsTaskUseCase({
        taskRepository,
        projectRepository,
        taskFileStorage,
        regenerateFailedFramePrompts: createRegenerateFailedFramePromptsUseCase({
          projectRepository,
          shotImageRepository,
          taskRepository,
          taskFileStorage,
          taskQueue,
          taskIdGenerator,
          clock: options.clock ?? {
            now: () => new Date().toISOString(),
          },
        }),
        clock: options.clock ?? {
          now: () => new Date().toISOString(),
        },
      }),
    processVideosGenerateTask: createProcessVideosGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      taskQueue,
      taskIdGenerator,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processFinalCutGenerateTask: createProcessFinalCutGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      finalCutRenderer,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processSegmentVideoPromptGenerateTask: createProcessSegmentVideoPromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      taskQueue,
      taskIdGenerator,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    processSegmentVideoGenerateTask: createProcessSegmentVideoGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      videoProvider,
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

function createStoryboardProviderWithGrokFallback(
  primary: MasterPlotProvider & StoryboardProvider,
  fallback: MasterPlotProvider & StoryboardProvider,
): MasterPlotProvider & StoryboardProvider {
  return {
    async generateMasterPlot(input) {
      try {
        return await primary.generateMasterPlot(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateMasterPlot(input);
      }
    },
    async generateStoryboard(input) {
      try {
        return await primary.generateStoryboard(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateStoryboard(input);
      }
    },
  };
}

function createShotScriptProviderWithGrokFallback(
  primary: ShotScriptProvider,
  fallback: ShotScriptProvider,
): ShotScriptProvider {
  return {
    generateShotScript: primary.generateShotScript
      ? async (input) => {
          try {
            return await primary.generateShotScript!(input);
          } catch (error) {
            if (!shouldRetryWithGrok(error) || !fallback.generateShotScript) {
              throw error;
            }

            return fallback.generateShotScript(input);
          }
        }
      : undefined,
    async generateShotScriptSegment(input) {
      try {
        return await primary.generateShotScriptSegment(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateShotScriptSegment(input);
      }
    },
  };
}

function createCharacterSheetPromptProviderWithGrokFallback(
  primary: CharacterSheetPromptProvider,
  fallback: CharacterSheetPromptProvider,
): CharacterSheetPromptProvider {
  return {
    async generateCharacterPrompt(input) {
      try {
        return await primary.generateCharacterPrompt(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateCharacterPrompt(input);
      }
    },
  };
}

function createFramePromptProviderWithGrokFallback(
  primary: FramePromptProvider,
  fallback: FramePromptProvider,
): FramePromptProvider {
  return {
    async generateFramePrompt(input) {
      try {
        return await primary.generateFramePrompt(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateFramePrompt(input);
      }
    },
  };
}

function shouldRetryWithGrok(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("PROHIBITED_CONTENT") ||
    /content is prohibited/i.test(error.message)
  );
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
    listShotsByBatchId() {
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
    resolveProjectAssetPath() {
      throw new Error("Shot image storage is not configured");
    },
  };
}

function createUnsupportedVideoRepository(): VideoRepository {
  return {
    insertBatch() {
      throw new Error("Video repository is not configured");
    },
    findBatchById() {
      throw new Error("Video repository is not configured");
    },
    findCurrentBatchByProjectId() {
      throw new Error("Video repository is not configured");
    },
    listSegmentsByBatchId() {
      throw new Error("Video repository is not configured");
    },
    insertSegment() {
      throw new Error("Video repository is not configured");
    },
    findSegmentById() {
      throw new Error("Video repository is not configured");
    },
    findCurrentSegmentByProjectIdAndSegmentId() {
      throw new Error("Video repository is not configured");
    },
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentId() {
      throw new Error("Video repository is not configured");
    },
    updateSegment() {
      throw new Error("Video repository is not configured");
    },
    findCurrentFinalCutByProjectId() {
      throw new Error("Video repository is not configured");
    },
    upsertFinalCut() {
      throw new Error("Video repository is not configured");
    },
  };
}

function createUnsupportedVideoStorage(): VideoStorage {
  return {
    async initializePromptTemplate() {
      throw new Error("Video storage is not configured");
    },
    async readPromptTemplate() {
      throw new Error("Video storage is not configured");
    },
    async writePromptSnapshot() {
      throw new Error("Video storage is not configured");
    },
    async writePromptPlan() {
      throw new Error("Video storage is not configured");
    },
    async writeRawResponse() {
      throw new Error("Video storage is not configured");
    },
    async writeBatchManifest() {
      throw new Error("Video storage is not configured");
    },
    async writeCurrentVideo() {
      throw new Error("Video storage is not configured");
    },
    async writeVideoVersion() {
      throw new Error("Video storage is not configured");
    },
    async writeFinalCutManifest() {
      throw new Error("Video storage is not configured");
    },
    async writeFinalCutFiles() {
      throw new Error("Video storage is not configured");
    },
    resolveProjectAssetPath() {
      throw new Error("Video storage is not configured");
    },
  };
}
