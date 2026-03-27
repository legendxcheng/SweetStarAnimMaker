import {
  createTaskRecord,
  frameImageGenerateQueueName,
  type FrameImageGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";

export interface RegenerateFailedFrameImagesInput {
  projectId: string;
}

export interface RegenerateFailedFrameImagesResult {
  batchId: string;
  frameCount: number;
  taskIds: string[];
}

export interface RegenerateFailedFrameImagesUseCase {
  execute(input: RegenerateFailedFrameImagesInput): Promise<RegenerateFailedFrameImagesResult>;
}

export interface RegenerateFailedFrameImagesUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateFailedFrameImagesUseCase(
  dependencies: RegenerateFailedFrameImagesUseCaseDependencies,
): RegenerateFailedFrameImagesUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentImageBatchId) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const shots = dependencies.shotImageRepository.listShotsByBatchId
        ? await dependencies.shotImageRepository.listShotsByBatchId(project.currentImageBatchId)
        : null;
      const failedFrames =
        shots
          ?.flatMap((shot) => [shot.startFrame, ...(shot.endFrame ? [shot.endFrame] : [])])
          .filter(
            (frame) =>
              frame.planStatus === "planned" && frame.imageStatus === "failed",
          ) ??
        (await dependencies.shotImageRepository.listFramesByBatchId(project.currentImageBatchId))
          .filter(
            (frame) =>
              frame.planStatus === "planned" && frame.imageStatus === "failed",
          );
      const timestamp = dependencies.clock.now();
      const taskIds: string[] = [];

      for (const frame of failedFrames) {
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
        await dependencies.taskFileStorage.createTaskArtifacts({
          task,
          input: taskInput,
        });

        const updatedFrame = {
          ...frame,
          imageStatus: "generating" as const,
          approvedAt: null,
          updatedAt: timestamp,
          sourceTaskId: task.id,
        };
        await dependencies.shotImageRepository.updateFrame(updatedFrame);

        await dependencies.taskQueue.enqueue({
          taskId: task.id,
          queueName: task.queueName,
          taskType: task.type,
        });
        taskIds.push(task.id);
      }

      if (taskIds.length > 0) {
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "images_generating",
          updatedAt: timestamp,
        });
      }

      return {
        batchId: project.currentImageBatchId,
        frameCount: failedFrames.length,
        taskIds,
      };
    },
  };
}
