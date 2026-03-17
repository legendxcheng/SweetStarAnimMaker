import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  storyboardGenerateQueueName,
  type StoryboardGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateStoryboardGenerateTaskInput {
  projectId: string;
}

export interface CreateStoryboardGenerateTaskUseCase {
  execute(input: CreateStoryboardGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateStoryboardGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateStoryboardGenerateTaskUseCase(
  dependencies: CreateStoryboardGenerateTaskUseCaseDependencies,
): CreateStoryboardGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "storyboard_generate",
        queueName: storyboardGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: StoryboardGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "storyboard_generate",
        scriptPath: project.scriptRelPath,
        scriptUpdatedAt: project.scriptUpdatedAt,
      };

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
}
