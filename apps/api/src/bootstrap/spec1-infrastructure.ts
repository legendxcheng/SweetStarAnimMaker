import type { Clock, VideoPromptProvider } from "@sweet-star/core";
import {
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

export interface Spec1InfrastructureOptions {
  workspaceRoot: string;
  videoPromptProvider?: VideoPromptProvider;
}

export function createSpec1Infrastructure(options: Spec1InfrastructureOptions) {
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
  } satisfies Clock;

  return {
    paths,
    db,
    repository,
    premiseStorage,
    taskRepository,
    taskFileStorage,
    storyboardStorage,
    shotScriptStorage,
    characterSheetRepository,
    sceneSheetRepository,
    shotImageRepository,
    videoRepository,
    shotScriptReviewRepository,
    characterSheetStorage,
    sceneSheetStorage,
    shotImageStorage,
    videoStorage,
    videoPromptProvider,
    masterPlotStorage,
    clock,
  };
}

export type Spec1Infrastructure = ReturnType<typeof createSpec1Infrastructure>;
