import {
  createProcessStoryboardGenerateTaskUseCase,
  type Clock,
  type LlmStoryboardProvider,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type ScriptStorage,
  type StoryboardStorage,
  type StoryboardVersionRepository,
  type TaskFileStorage,
  type TaskRepository,
} from "@sweet-star/core";
import {
  createFileScriptStorage,
  createGeminiStoryboardProvider,
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardVersionRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
  createTaskFileStorage,
  initializeSqliteSchema,
} from "@sweet-star/services";

export interface BuildSpec2WorkerServicesOptions {
  workspaceRoot?: string;
  projectRepository?: ProjectRepository;
  taskRepository?: TaskRepository;
  scriptStorage?: ScriptStorage;
  taskFileStorage?: TaskFileStorage;
  storyboardStorage?: StoryboardStorage;
  storyboardVersionRepository?: StoryboardVersionRepository;
  storyboardProvider?: LlmStoryboardProvider;
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

  if (db) {
    initializeSqliteSchema(db);
  }

  const taskRepository =
    options.taskRepository ?? (db ? createSqliteTaskRepository({ db }) : null);
  const projectRepository =
    options.projectRepository ?? (db ? createSqliteProjectRepository({ db }) : null);
  const scriptStorage =
    options.scriptStorage ?? (paths ? createFileScriptStorage({ paths }) : null);
  const taskFileStorage =
    options.taskFileStorage ?? (paths ? createTaskFileStorage({ paths }) : null);
  const storyboardStorage =
    options.storyboardStorage ?? (paths ? createStoryboardStorage({ paths }) : null);
  const storyboardVersionRepository =
    options.storyboardVersionRepository ??
    (db ? createSqliteStoryboardVersionRepository({ db }) : null);
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
    !scriptStorage ||
    !taskFileStorage ||
    !storyboardStorage ||
    !storyboardVersionRepository
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
      scriptStorage,
      storyboardProvider,
      storyboardStorage,
      storyboardVersionRepository,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    async close() {
      db?.close();
    },
  };
}
