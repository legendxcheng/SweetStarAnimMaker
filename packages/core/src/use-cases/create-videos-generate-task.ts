import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  videosGenerateQueueName,
  type VideosGenerateTaskInput,
} from "../domain/task";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateVideosGenerateTaskInput {
  projectId: string;
}

export interface CreateVideosGenerateTaskUseCase {
  execute(input: CreateVideosGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateVideosGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  shotScriptStorage: ShotScriptStorage;
  storyboardStorage: StoryboardStorage;
  masterPlotStorage: MasterPlotStorage;
  characterSheetRepository: CharacterSheetRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateVideosGenerateTaskUseCase(
  dependencies: CreateVideosGenerateTaskUseCaseDependencies,
): CreateVideosGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (project.status !== "images_approved") {
        throw new ProjectValidationError("Video generation requires images_approved");
      }

      if (!project.currentImageBatchId) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const imageBatch = await dependencies.shotImageRepository.findBatchById(project.currentImageBatchId);

      if (!imageBatch) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const shots = dependencies.shotImageRepository.listShotsByBatchId
        ? await dependencies.shotImageRepository.listShotsByBatchId(imageBatch.id)
        : null;
      const frames = shots ? [] : await dependencies.shotImageRepository.listFramesByBatchId(imageBatch.id);
      const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!shotScript || !shotScript.approvedAt) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const storyboard =
        project.currentStoryboardId != null
          ? await dependencies.storyboardStorage.readCurrentStoryboard({
              storageDir: project.storageDir,
            })
          : null;

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "videos_generate",
        queueName: videosGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: VideosGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "videos_generate",
        sourceImageBatchId: imageBatch.id,
        imageBatch: {
          id: imageBatch.id,
          sourceShotScriptId: imageBatch.sourceShotScriptId,
          shotCount: imageBatch.shotCount ?? imageBatch.segmentCount,
          totalRequiredFrameCount: imageBatch.totalRequiredFrameCount ?? imageBatch.totalFrameCount,
          approvedShotCount: shots
            ? shots.filter((shot) => shot.referenceStatus === "approved").length
            : frames.filter((frame) => frame.imageStatus === "approved").length,
          segmentCount: imageBatch.segmentCount,
          totalFrameCount: imageBatch.totalFrameCount,
          approvedFrameCount: frames.filter((frame) => frame.imageStatus === "approved").length,
          updatedAt: imageBatch.updatedAt,
        },
        sourceShotScriptId: shotScript.id,
        shotScript,
        sourceStoryboardId: shotScript.sourceStoryboardId,
        storyboard: storyboard
          ? {
              id: storyboard.id,
              title: storyboard.title,
              episodeTitle: storyboard.episodeTitle,
            }
          : undefined,
        promptTemplateKey: "segment_video.generate",
      };

      await dependencies.taskRepository.insert(task);
      await dependencies.taskFileStorage.createTaskArtifacts({ task, input: taskInput });
      await dependencies.taskQueue.enqueue({
        taskId: task.id,
        queueName: task.queueName,
        taskType: task.type,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "videos_generating",
        updatedAt: timestamp,
      });

      return toTaskDetailDto(task);
    },
  };
}
