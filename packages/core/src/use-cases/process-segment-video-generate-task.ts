import type { ProjectStatus } from "@sweet-star/shared";

import type { SegmentVideoGenerateTaskInput } from "../domain/task";

import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoProvider } from "../ports/video-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessSegmentVideoGenerateTaskInput {
  taskId: string;
}

export interface ProcessSegmentVideoGenerateTaskUseCase {
  execute(input: ProcessSegmentVideoGenerateTaskInput): Promise<void>;
}

export interface ProcessSegmentVideoGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  videoProvider: VideoProvider;
  clock: Clock;
}

export function createProcessSegmentVideoGenerateTaskUseCase(
  dependencies: ProcessSegmentVideoGenerateTaskUseCaseDependencies,
): ProcessSegmentVideoGenerateTaskUseCase {
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
      let currentSegment:
        | Awaited<ReturnType<VideoRepository["findCurrentSegmentByProjectIdAndSegmentId"]>>
        | null = null;

      try {
        const taskInput = (await dependencies.taskFileStorage.readTaskInput({
          task,
        })) as SegmentVideoGenerateTaskInput;
        project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        currentSegment =
          await dependencies.videoRepository.findCurrentSegmentByProjectIdAndSceneIdAndSegmentId(
            project.id,
            taskInput.sceneId,
            taskInput.segmentId,
          );

        if (!currentSegment) {
          throw new SegmentVideoNotFoundError(taskInput.segmentId);
        }

        const startFramePath = await dependencies.videoStorage.resolveProjectAssetPath({
          projectStorageDir: project.storageDir,
          assetRelPath: taskInput.startFrame.imageAssetPath ?? "",
        });
        const endFramePath = await dependencies.videoStorage.resolveProjectAssetPath({
          projectStorageDir: project.storageDir,
          assetRelPath: taskInput.endFrame.imageAssetPath ?? "",
        });
        const promptVariables = {
          segment: taskInput.segment,
          startFrame: {
            imageAssetPath: taskInput.startFrame.imageAssetPath,
            width: taskInput.startFrame.imageWidth ?? null,
            height: taskInput.startFrame.imageHeight ?? null,
          },
          endFrame: {
            imageAssetPath: taskInput.endFrame.imageAssetPath,
            width: taskInput.endFrame.imageWidth ?? null,
            height: taskInput.endFrame.imageHeight ?? null,
          },
        };
        const promptText = currentSegment.promptTextCurrent;

        await dependencies.videoStorage.writePromptSnapshot({
          taskStorageDir: task.storageDir,
          promptText,
          promptVariables,
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `requesting video provider for segment ${currentSegment.id}`,
        });

        const providerResult = await dependencies.videoProvider.generateSegmentVideo({
          projectId: project.id,
          segmentId: taskInput.segmentId,
          promptText,
          startFramePath,
          endFramePath,
          durationSec: taskInput.segment.durationSec,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.videoStorage.writeRawResponse({
          taskStorageDir: task.storageDir,
          rawResponse: providerResult.rawResponse,
        });

        const finishedAt = dependencies.clock.now();
        const updatedSegment = {
          ...currentSegment,
          status: "in_review" as const,
          videoAssetPath: currentSegment.currentVideoRelPath,
          thumbnailAssetPath: providerResult.thumbnailUrl ? currentSegment.thumbnailRelPath : null,
          durationSec: providerResult.durationSec ?? taskInput.segment.durationSec ?? null,
          provider: providerResult.provider,
          model: providerResult.model,
          updatedAt: finishedAt,
          sourceTaskId: task.id,
        };

        await dependencies.videoStorage.writeCurrentVideo({
          segment: updatedSegment,
          videoSourceUrl: providerResult.videoUrl,
          thumbnailSourceUrl: providerResult.thumbnailUrl,
          metadata: {
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
            durationSec: updatedSegment.durationSec,
          },
        });
        await dependencies.videoStorage.writeVideoVersion({
          segment: updatedSegment,
          versionTag: task.id,
          videoSourceUrl: providerResult.videoUrl,
          thumbnailSourceUrl: providerResult.thumbnailUrl,
          metadata: {
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
            durationSec: updatedSegment.durationSec,
          },
        });
        await dependencies.videoRepository.updateSegment(updatedSegment);
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "videos_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            segmentId: updatedSegment.segmentId,
            videoAssetPath: updatedSegment.videoAssetPath,
            thumbnailAssetPath: updatedSegment.thumbnailAssetPath,
            provider: updatedSegment.provider,
            model: updatedSegment.model,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "segment video generation succeeded",
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
          message: `segment video generation failed: ${errorMessage}`,
        });

        if (project && currentSegment) {
          const restoredSegment = {
            ...currentSegment,
            status: currentSegment.videoAssetPath ? ("in_review" as const) : ("failed" as const),
            updatedAt: finishedAt,
          };

          await dependencies.videoRepository.updateSegment(restoredSegment);

          const segments = await dependencies.videoRepository.listSegmentsByBatchId(currentSegment.batchId);
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: deriveProjectVideoStatus(segments, restoredSegment),
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

function deriveProjectVideoStatus(
  segments: Array<{ id: string; status: string }>,
  updatedSegment: { id: string; status: string },
): ProjectStatus {
  const nextSegments = segments.some((segment) => segment.id === updatedSegment.id)
    ? segments.map((segment) => (segment.id === updatedSegment.id ? updatedSegment : segment))
    : [...segments, updatedSegment];

  if (nextSegments.some((segment) => segment.status === "generating")) {
    return "videos_generating";
  }

  if (nextSegments.every((segment) => segment.status === "approved")) {
    return "videos_approved";
  }

  return "videos_in_review";
}
