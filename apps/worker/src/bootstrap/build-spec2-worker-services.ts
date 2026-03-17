import {
  createProcessStoryboardGenerateTaskUseCase,
  type Clock,
  type ProcessStoryboardGenerateTaskUseCase,
  type StoryboardGenerateTaskHandler,
  type TaskFileStorage,
  type TaskRepository,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteTaskRepository,
  createTaskFileStorage,
  initializeSqliteSchema,
} from "@sweet-star/services";

export interface BuildSpec2WorkerServicesOptions {
  workspaceRoot?: string;
  taskRepository?: TaskRepository;
  taskFileStorage?: TaskFileStorage;
  handler?: StoryboardGenerateTaskHandler;
  clock?: Clock;
}

export interface Spec2WorkerServices {
  processStoryboardGenerateTask: ProcessStoryboardGenerateTaskUseCase;
  close(): Promise<void>;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  const paths = options.workspaceRoot
    ? createLocalDataPaths(options.workspaceRoot)
    : null;
  const db = paths ? createSqliteDb({ paths }) : null;

  if (db) {
    initializeSqliteSchema(db);
  }

  const taskRepository =
    options.taskRepository ?? (db ? createSqliteTaskRepository({ db }) : null);
  const taskFileStorage =
    options.taskFileStorage ?? (paths ? createTaskFileStorage({ paths }) : null);

  if (!taskRepository || !taskFileStorage) {
    throw new Error(
      "buildSpec2WorkerServices requires either workspaceRoot or explicit task dependencies",
    );
  }

  return {
    processStoryboardGenerateTask: createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      taskFileStorage,
      handler:
        options.handler ??
        {
          async run(input) {
            return {
              taskId: input.taskId,
              projectId: input.projectId,
              taskType: input.taskType,
              sourceScriptPath: input.scriptPath,
              sourceScriptUpdatedAt: input.scriptUpdatedAt,
              summary: "Generated placeholder storyboard",
              scenes: [
                {
                  id: `${input.taskId}_scene_1`,
                  title: "Placeholder opening scene",
                  prompt: "Deterministic placeholder storyboard output",
                },
              ],
            };
          },
        },
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
    async close() {
      db?.close();
    },
  };
}
