import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface ImageBatchProcessDelegateResult {
  batchId: string;
  frameCount: number;
  taskIds: string[];
}

export interface ProcessImageBatchDelegateTaskInput {
  taskId: string;
}

export interface ProcessImageBatchDelegateTaskUseCase {
  execute(input: ProcessImageBatchDelegateTaskInput): Promise<void>;
}

export interface ProcessImageBatchDelegateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  clock: Clock;
}

export function createProcessImageBatchDelegateTaskUseCase(config: {
  expectedTaskType:
    | "image_batch_regenerate_all_prompts"
    | "image_batch_regenerate_failed_prompts"
    | "image_batch_regenerate_failed_frames";
  run(input: { projectId: string }): Promise<ImageBatchProcessDelegateResult>;
}) {
  return function createUseCase(
    dependencies: ProcessImageBatchDelegateTaskUseCaseDependencies,
  ): ProcessImageBatchDelegateTaskUseCase {
    return {
      async execute(input) {
        const task = await dependencies.taskRepository.findById(input.taskId);

        if (!task) {
          throw new TaskNotFoundError(input.taskId);
        }

        const startedAt = dependencies.clock.now();

        await dependencies.taskRepository.markRunning({
          taskId: task.id,
          updatedAt: startedAt,
          startedAt,
        });

        try {
          const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });

          if (taskInput.taskType !== config.expectedTaskType) {
            throw new Error(
              `Unsupported task input for ${config.expectedTaskType}: ${taskInput.taskType}`,
            );
          }

          const project = await dependencies.projectRepository.findById(task.projectId);

          if (!project) {
            throw new ProjectNotFoundError(task.projectId);
          }

          const result = await config.run({ projectId: project.id });
          const finishedAt = dependencies.clock.now();

          await dependencies.taskFileStorage.writeTaskOutput({
            task,
            output: {
              batchId: result.batchId,
              createdTaskCount: result.frameCount,
              childTaskIds: result.taskIds,
            },
          });
          await dependencies.taskFileStorage.appendTaskLog({
            task,
            message: `${config.expectedTaskType} succeeded with ${result.frameCount} child task(s)`,
          });
          await dependencies.taskRepository.markSucceeded({
            taskId: task.id,
            updatedAt: finishedAt,
            finishedAt,
          });
        } catch (error) {
          const finishedAt = dependencies.clock.now();
          const errorMessage = error instanceof Error ? error.message : "Task failed";

          await dependencies.taskFileStorage.appendTaskLog({
            task,
            message: `${config.expectedTaskType} failed: ${errorMessage}`,
          });
          await dependencies.taskRepository.markFailed({
            taskId: task.id,
            errorMessage,
            updatedAt: finishedAt,
            finishedAt,
          });
          throw error;
        }
      },
    };
  };
}
