import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  type ImageBatchGenerateAllFramesTaskInput,
  type ImageBatchRegenerateAllPromptsTaskInput,
  type ImageBatchRegenerateFailedFramesTaskInput,
  type ImageBatchRegenerateFailedPromptsTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

type ImageBatchTaskInput =
  | ImageBatchGenerateAllFramesTaskInput
  | ImageBatchRegenerateFailedFramesTaskInput
  | ImageBatchRegenerateAllPromptsTaskInput
  | ImageBatchRegenerateFailedPromptsTaskInput;

export interface CreateImageBatchTaskInput {
  projectId: string;
}

export interface CreateImageBatchTaskUseCase {
  execute(input: CreateImageBatchTaskInput): Promise<TaskDetail>;
}

export interface CreateImageBatchTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createImageBatchTaskUseCase(config: {
  taskType: ImageBatchTaskInput["taskType"];
  queueName: string;
  buildInput(input: {
    taskId: string;
    projectId: string;
    batchId: string;
  }): ImageBatchTaskInput;
}) {
  return function createUseCase(
    dependencies: CreateImageBatchTaskUseCaseDependencies,
  ): CreateImageBatchTaskUseCase {
    return {
      async execute(input) {
        const project = await dependencies.projectRepository.findById(input.projectId);

        if (!project) {
          throw new ProjectNotFoundError(input.projectId);
        }

        if (!project.currentImageBatchId) {
          throw new CurrentImageBatchNotFoundError(project.id);
        }

        const timestamp = dependencies.clock.now();
        const task = createTaskRecord({
          id: dependencies.taskIdGenerator.generateTaskId(),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          type: config.taskType,
          queueName: config.queueName,
          createdAt: timestamp,
        });
        const taskInput = config.buildInput({
          taskId: task.id,
          projectId: project.id,
          batchId: project.currentImageBatchId,
        });

        await dependencies.taskRepository.insert(task);

        try {
          await dependencies.taskFileStorage.createTaskArtifacts({
            task,
            input: taskInput,
          });
        } catch (error) {
          await dependencies.taskRepository.delete(task.id);
          throw error;
        }

        try {
          await dependencies.taskQueue.enqueue({
            taskId: task.id,
            queueName: task.queueName,
            taskType: task.type,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Task enqueue failed";

          await dependencies.taskRepository.markFailed({
            taskId: task.id,
            errorMessage: message,
            updatedAt: timestamp,
            finishedAt: timestamp,
          });
          throw error;
        }

        return toTaskDetailDto(task);
      },
    };
  };
}
