import path from "node:path";

import { ProjectNotFoundError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageProvider } from "../ports/shot-image-provider";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface ProcessFrameImageGenerateTaskInput {
  taskId: string;
}

export interface ProcessFrameImageGenerateTaskUseCase {
  execute(input: ProcessFrameImageGenerateTaskInput): Promise<void>;
}

export interface ProcessFrameImageGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotImageRepository: ShotImageRepository;
  shotImageStorage: ShotImageStorage;
  shotImageProvider: ShotImageProvider;
  clock: Clock;
}

export function createProcessFrameImageGenerateTaskUseCase(
  dependencies: ProcessFrameImageGenerateTaskUseCaseDependencies,
): ProcessFrameImageGenerateTaskUseCase {
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
        assertFrameImageTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const frame = await dependencies.shotImageRepository.findFrameById(taskInput.frameId);

        if (!frame || frame.projectId !== project.id) {
          throw new ShotImageNotFoundError(taskInput.frameId);
        }

        const resolvedReferenceImagePaths = await Promise.all(
          frame.matchedReferenceImagePaths.map((referenceImagePath) =>
            path.isAbsolute(referenceImagePath)
              ? referenceImagePath
              : dependencies.shotImageStorage.resolveProjectAssetPath({
                  projectStorageDir: project.storageDir,
                  assetRelPath: referenceImagePath,
              }),
          ),
        );
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `requesting shot image provider for frame ${frame.id} with ${resolvedReferenceImagePaths.length} reference image(s)`,
        });
        const imageResult = await dependencies.shotImageProvider.generateShotImage({
          projectId: project.id,
          frameId: frame.id,
          promptText: frame.promptTextCurrent,
          negativePromptText: frame.negativePromptTextCurrent,
          referenceImagePaths: resolvedReferenceImagePaths,
        });
        const finishedAt = dependencies.clock.now();
        const updatedFrame = {
          ...frame,
          imageStatus: "in_review" as const,
          imageAssetPath: frame.currentImageRelPath,
          imageWidth: imageResult.width,
          imageHeight: imageResult.height,
          provider: imageResult.provider,
          model: imageResult.model,
          updatedAt: finishedAt,
          sourceTaskId: task.id,
        };

        await dependencies.shotImageStorage.writeCurrentImage({
          frame: updatedFrame,
          imageBytes: imageResult.imageBytes,
          metadata: {
            rawResponse: imageResult.rawResponse,
            provider: imageResult.provider,
            model: imageResult.model,
            width: imageResult.width,
            height: imageResult.height,
          },
        });
        await dependencies.shotImageStorage.writeImageVersion({
          frame: updatedFrame,
          versionTag: task.id,
          imageBytes: imageResult.imageBytes,
          metadata: {
            rawResponse: imageResult.rawResponse,
            provider: imageResult.provider,
            model: imageResult.model,
            width: imageResult.width,
            height: imageResult.height,
          },
        });
        await dependencies.shotImageRepository.updateFrame(updatedFrame);
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "images_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            frameId: updatedFrame.id,
            imageAssetPath: updatedFrame.imageAssetPath,
            provider: updatedFrame.provider,
            model: updatedFrame.model,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "frame image generation succeeded",
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
          message: `frame image generation failed: ${errorMessage}`,
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

function assertFrameImageTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "frame_image_generate";
  batchId: string;
  frameId: string;
} {
  if (input.taskType !== "frame_image_generate") {
    throw new Error(`Unsupported task input for frame image processing: ${input.taskType}`);
  }
}
