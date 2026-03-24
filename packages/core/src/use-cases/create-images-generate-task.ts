import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  imagesGenerateQueueName,
  type ImagesGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateImagesGenerateTaskInput {
  projectId: string;
}

export interface CreateImagesGenerateTaskUseCase {
  execute(input: CreateImagesGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateImagesGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateImagesGenerateTaskUseCase(
  dependencies: CreateImagesGenerateTaskUseCaseDependencies,
): CreateImagesGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (project.status !== "shot_script_approved") {
        throw new ProjectValidationError("Image generation requires shot_script_approved");
      }

      const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!currentShotScript || !currentShotScript.approvedAt) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "images_generate",
        queueName: imagesGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: ImagesGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "images_generate",
        sourceShotScriptId: currentShotScript.id,
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
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "images_generating",
          updatedAt: timestamp,
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
