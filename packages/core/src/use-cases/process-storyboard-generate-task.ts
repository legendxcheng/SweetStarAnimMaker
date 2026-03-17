import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface StoryboardGenerateTaskHandler {
  run(input: Awaited<ReturnType<TaskFileStorage["readTaskInput"]>>): Promise<unknown>;
}

export interface ProcessStoryboardGenerateTaskInput {
  taskId: string;
}

export interface ProcessStoryboardGenerateTaskUseCase {
  execute(input: ProcessStoryboardGenerateTaskInput): Promise<void>;
}

export interface ProcessStoryboardGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  clock: Clock;
  handler: StoryboardGenerateTaskHandler;
}

export function createProcessStoryboardGenerateTaskUseCase(
  dependencies: ProcessStoryboardGenerateTaskUseCaseDependencies,
): ProcessStoryboardGenerateTaskUseCase {
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
        const output = await dependencies.handler.run(taskInput);

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output,
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "storyboard generation succeeded",
        });

        const finishedAt = dependencies.clock.now();

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
          message: `storyboard generation failed: ${errorMessage}`,
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
}
