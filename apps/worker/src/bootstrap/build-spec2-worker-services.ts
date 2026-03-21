import {
  createProcessStoryboardGenerateTaskUseCase,
  type Clock,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type MasterPlotStorage,
  type StoryboardProvider,
  type StoryboardStorage,
  type TaskFileStorage,
  type TaskRepository,
} from "@sweet-star/core";
import {
  createGeminiStoryboardProvider,
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
  createTaskFileStorage,
  initializeSqliteSchema,
} from "@sweet-star/services";

export interface BuildSpec2WorkerServicesOptions {
  workspaceRoot?: string;
  projectRepository?: ProjectRepository;
  taskRepository?: TaskRepository;
  taskFileStorage?: TaskFileStorage;
  masterPlotStorage?: MasterPlotStorage;
  storyboardStorage?: StoryboardStorage;
  storyboardProvider?: StoryboardProvider;
  clock?: Clock;
}

export interface Spec2WorkerServices {
  processStoryboardGenerateTask: ProcessStoryboardGenerateTaskUseCase;
  close(): Promise<void>;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  const paths = options.workspaceRoot ? createLocalDataPaths(options.workspaceRoot) : null;
  const db = paths ? createSqliteDb({ paths }) : null;
  const defaultStorage = paths ? createStoryboardStorage({ paths }) : null;

  if (db) {
    initializeSqliteSchema(db);
  }

  const taskRepository =
    options.taskRepository ?? (db ? createSqliteTaskRepository({ db }) : null);
  const projectRepository =
    options.projectRepository ?? (db ? createSqliteProjectRepository({ db }) : null);
  const taskFileStorage =
    options.taskFileStorage ?? (paths ? createTaskFileStorage({ paths }) : null);
  const storyboardStorage = options.storyboardStorage ?? defaultStorage;
  const masterPlotStorage = options.masterPlotStorage ?? defaultStorage;
  const storyboardProvider =
    options.storyboardProvider ??
    createGeminiStoryboardProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.STORYBOARD_LLM_MODEL,
    });

  if (
    !taskRepository ||
    !projectRepository ||
    !taskFileStorage ||
    !masterPlotStorage ||
    !storyboardStorage
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
    async close() {
      db?.close();
    },
  };
}
