import {
  createProcessStoryboardGenerateTaskUseCase,
  type Clock,
  type MasterPlotProvider,
  type ProcessStoryboardGenerateTaskUseCase,
  type ProjectRepository,
  type MasterPlotStorage,
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
  masterPlotProvider?: MasterPlotProvider;
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
  const taskFileStorage =
    options.taskFileStorage ?? (paths ? createTaskFileStorage({ paths }) : null);
  const masterPlotStorage =
    options.masterPlotStorage ?? (paths ? createStoryboardStorage({ paths }) : null);
  const masterPlotProvider =
    options.masterPlotProvider ??
    createGeminiStoryboardProvider({
      baseUrl: process.env.VECTORENGINE_BASE_URL,
      apiToken: process.env.VECTORENGINE_API_TOKEN,
      model: process.env.STORYBOARD_LLM_MODEL,
    });

  if (
    !taskRepository ||
    !projectRepository ||
    !taskFileStorage ||
    !masterPlotStorage
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
      masterPlotProvider,
      masterPlotStorage,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    async close() {
      db?.close();
    },
  };
}
