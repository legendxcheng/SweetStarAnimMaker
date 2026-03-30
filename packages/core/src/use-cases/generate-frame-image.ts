import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  frameImageGenerateQueueName,
  type FrameImageGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { resolveShotFrameRecord } from "./shot-reference-frame-helpers";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GenerateFrameImageInput {
  projectId: string;
  frameId: string;
}

export interface GenerateFrameImageUseCase {
  execute(input: GenerateFrameImageInput): Promise<TaskDetail>;
}

export interface GenerateFrameImageUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createGenerateFrameImageUseCase(
  dependencies: GenerateFrameImageUseCaseDependencies,
): GenerateFrameImageUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const frame = await dependencies.shotImageRepository.findFrameById(input.frameId);

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      if (frame.frameType === "end_frame") {
        const resolvedShotFrame = await resolveShotFrameRecord({
          repository: dependencies.shotImageRepository,
          batchId: frame.batchId,
          frameId: frame.id,
        });

        if (resolvedShotFrame?.shot && !resolvedShotFrame.shot.startFrame.imageAssetPath) {
          throw new ProjectValidationError(
            `Cannot generate end frame before start frame image exists: ${frame.id}`,
          );
        }
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "frame_image_generate",
        queueName: frameImageGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: FrameImageGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "frame_image_generate",
        batchId: frame.batchId,
        frameId: frame.id,
      };

      await dependencies.taskRepository.insert(task);

      try {
        await dependencies.taskFileStorage.createTaskArtifacts({
          task,
          input: taskInput,
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `frame image task created for frame ${frame.id}`,
        });
      } catch (error) {
        await dependencies.taskRepository.delete(task.id);
        throw error;
      }

      await dependencies.shotImageRepository.updateFrame({
        ...frame,
        imageStatus: "generating",
        approvedAt: null,
        updatedAt: timestamp,
        sourceTaskId: task.id,
      });

      try {
        await dependencies.taskQueue.enqueue({
          taskId: task.id,
          queueName: task.queueName,
          taskType: task.type,
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `frame image task queued for frame ${frame.id}`,
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
