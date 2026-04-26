import path from "node:path";

import type { ProjectStatus } from "@sweet-star/shared";

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
import { appendVisualStyleToPrompt } from "./append-visual-style-to-prompt";
import {
  deriveProjectImageStatusFromFrames,
  deriveProjectImageStatusFromShots,
  resolveShotFrameRecord,
} from "./shot-reference-frame-helpers";
import { isTaskStillActive } from "./task-reset-guard";

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

      let project:
        | Awaited<ReturnType<ProjectRepository["findById"]>>
        | null = null;
      let frame:
        | Awaited<ReturnType<ShotImageRepository["findFrameById"]>>
        | null = null;
      let shot:
        | Awaited<ReturnType<NonNullable<ShotImageRepository["findShotById"]>>>
        | null = null;

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertFrameImageTaskInput(taskInput);
        project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const resolvedShotFrame = await resolveShotFrameRecord({
          repository: dependencies.shotImageRepository,
          batchId: taskInput.batchId,
          frameId: taskInput.frameId,
        });
        shot = resolvedShotFrame?.shot ?? null;
        frame =
          resolvedShotFrame?.frame ??
          (await dependencies.shotImageRepository.findFrameById(taskInput.frameId));

        if (!frame || frame.projectId !== project.id) {
          throw new ShotImageNotFoundError(taskInput.frameId);
        }

        const activeProject = project;
        const activeFrame = frame;
        const resolveReferenceImagePath = (referenceImagePath: string) =>
          path.isAbsolute(referenceImagePath)
            ? referenceImagePath
            : dependencies.shotImageStorage.resolveProjectAssetPath({
                projectStorageDir: activeProject.storageDir,
                assetRelPath: referenceImagePath,
              });

        if (
          activeFrame.frameType === "end_frame" &&
          shot &&
          !shot.startFrame.imageAssetPath
        ) {
          throw new Error(
            `Cannot generate end frame before start frame image exists: ${activeFrame.id}`,
          );
        }

        const resolvedReferenceImagePaths = await Promise.all(
          activeFrame.matchedReferenceImagePaths.map(resolveReferenceImagePath),
        );

        const startFrameReferenceImagePath =
          activeFrame.frameType === "end_frame" && shot?.startFrame.imageAssetPath
            ? await resolveReferenceImagePath(shot.startFrame.imageAssetPath)
            : null;
        const providerReferenceImagePaths = startFrameReferenceImagePath
          ? [startFrameReferenceImagePath, ...resolvedReferenceImagePaths]
          : resolvedReferenceImagePaths;

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `requesting shot image provider for frame ${activeFrame.id} with ${providerReferenceImagePaths.length} reference image(s)`,
        });
        const imageResult = await dependencies.shotImageProvider.generateShotImage({
          projectId: activeProject.id,
          frameId: activeFrame.id,
          promptText: appendVisualStyleToPrompt(
            buildFrameImagePromptText({
              frameType: activeFrame.frameType,
              promptText: activeFrame.promptTextCurrent,
              hasStartFrameReference: Boolean(startFrameReferenceImagePath),
            }),
            activeProject.visualStyleText ?? "",
          ),
          negativePromptText: activeFrame.negativePromptTextCurrent,
          referenceImagePaths: providerReferenceImagePaths,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();
        const updatedFrame = {
          ...activeFrame,
          imageStatus: "in_review" as const,
          imageAssetPath: activeFrame.currentImageRelPath,
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
        let nextProjectStatus: ProjectStatus = "images_in_review";

        await dependencies.shotImageRepository.updateFrame(updatedFrame);

        if (shot && dependencies.shotImageRepository.listShotsByBatchId) {
          const shots = await dependencies.shotImageRepository.listShotsByBatchId(shot.batchId);
          nextProjectStatus = deriveProjectImageStatusFromShots(shots);
        }

        await dependencies.projectRepository.updateStatus({
          projectId: activeProject.id,
          status: nextProjectStatus,
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
        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `frame image generation failed: ${errorMessage}`,
        });

        if (project && frame) {
          const restoredFrame = {
            ...frame,
            imageStatus: frame.imageAssetPath ? ("in_review" as const) : ("failed" as const),
            updatedAt: finishedAt,
          };

          let nextProjectStatus: ProjectStatus = "images_in_review";

          await dependencies.shotImageRepository.updateFrame(restoredFrame);

          if (shot && dependencies.shotImageRepository.listShotsByBatchId) {
            const shots = await dependencies.shotImageRepository.listShotsByBatchId(shot.batchId);
            nextProjectStatus = deriveProjectImageStatusFromShots(shots);
          } else {
            const frames = await dependencies.shotImageRepository.listFramesByBatchId(
              frame.batchId,
            );
            nextProjectStatus = deriveProjectImageStatusFromFrames(frames, restoredFrame);
          }

          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: nextProjectStatus,
            updatedAt: finishedAt,
          });
        }

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

function buildFrameImagePromptText(input: {
  frameType: "start_frame" | "end_frame";
  promptText: string;
  hasStartFrameReference: boolean;
}) {
  if (input.frameType !== "end_frame" || !input.hasStartFrameReference) {
    return input.promptText;
  }

  return [
    "参考图1是当前 segment 的首帧，请在参考图1的基础上生成尾帧。",
    "必须保持参考图1中的角色身份、服装、场景空间、主光线和画幅连续，但画面内容要推进到提示词描述的结束状态；不要复刻参考图1，也不要只做左右反打或同义构图。",
    input.promptText,
  ].join("\n");
}
