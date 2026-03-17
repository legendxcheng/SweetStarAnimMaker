import {
  createProcessStoryboardGenerateTaskUseCase,
  type Clock,
  type ProcessStoryboardGenerateTaskUseCase,
  type StoryboardGenerateTaskHandler,
  type TaskFileStorage,
  type TaskRepository,
} from "@sweet-star/core";

export interface BuildSpec2WorkerServicesOptions {
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  handler: StoryboardGenerateTaskHandler;
  clock?: Clock;
}

export interface Spec2WorkerServices {
  processStoryboardGenerateTask: ProcessStoryboardGenerateTaskUseCase;
}

export function buildSpec2WorkerServices(
  options: BuildSpec2WorkerServicesOptions,
): Spec2WorkerServices {
  return {
    processStoryboardGenerateTask: createProcessStoryboardGenerateTaskUseCase({
      taskRepository: options.taskRepository,
      taskFileStorage: options.taskFileStorage,
      handler: options.handler,
      clock: options.clock ?? {
        now: () => new Date().toISOString(),
      },
    }),
  };
}
