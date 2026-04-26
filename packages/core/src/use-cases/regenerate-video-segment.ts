import type { TaskDetail } from "@sweet-star/shared";

import { createTaskRecord, segmentVideoGenerateQueueName, type SegmentVideoGenerateTaskInput } from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoRepository } from "../ports/video-repository";
import { toTaskDetailDto } from "./task-detail-dto";

const videoRegenerateAllowedStatuses = new Set([
  "images_approved",
  "videos_generating",
  "videos_in_review",
  "videos_approved",
]);

export interface RegenerateVideoSegmentInput {
  projectId: string;
  videoId: string;
}

export interface RegenerateVideoSegmentUseCase {
  execute(input: RegenerateVideoSegmentInput): Promise<TaskDetail>;
}

export interface RegenerateVideoSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotImageRepository: ShotImageRepository;
  videoRepository: VideoRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateVideoSegmentUseCase(
  dependencies: RegenerateVideoSegmentUseCaseDependencies,
): RegenerateVideoSegmentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!videoRegenerateAllowedStatuses.has(project.status)) {
        throw new ProjectValidationError("Video regenerate requires images_approved");
      }

      const currentSegment = await dependencies.videoRepository.findSegmentById(input.videoId);

      if (
        !currentSegment ||
        currentSegment.projectId !== project.id ||
        currentSegment.batchId !== project.currentVideoBatchId
      ) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!shotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const segment = shotScript.segments.find(
        (item) =>
          item.segmentId === currentSegment.segmentId && item.sceneId === currentSegment.sceneId,
      );

      if (!segment) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      if (!dependencies.shotImageRepository.listShotsByBatchId) {
        throw new Error("Shot-based image repository is required for video regeneration");
      }

      const shotReference = (
        await dependencies.shotImageRepository.listShotsByBatchId(currentSegment.sourceImageBatchId)
      ).find((shot) => shot.shotId === currentSegment.shotId);

      const shot = segment.shots.find((item) => item.id === currentSegment.shotId);

      if (!shotReference || !shot) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      if (
        !shotReference.startFrame.imageAssetPath ||
        (shotReference.frameDependency === "start_and_end_frame" &&
          !shotReference.endFrame?.imageAssetPath)
      ) {
        throw new Error(`Approved frame pair missing for video ${input.videoId}`);
      }

      const timestamp = dependencies.clock.now();
      const referenceImages = filterCurrentSegmentReferenceImagesForStrategy(
        currentSegment.referenceImages ?? [],
        project.videoReferenceStrategy,
      );
      await dependencies.videoRepository.updateSegment({
        ...currentSegment,
        status: "generating",
        approvedAt: null,
        referenceImages,
        updatedAt: timestamp,
      });
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "segment_video_generate",
        queueName: segmentVideoGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: SegmentVideoGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "segment_video_generate",
        batchId: currentSegment.batchId,
        sourceImageBatchId: currentSegment.sourceImageBatchId,
        sourceShotScriptId: currentSegment.sourceShotScriptId,
        segmentId: currentSegment.segmentId,
        sceneId: currentSegment.sceneId,
        shotId: currentSegment.shotId,
        shotCode: currentSegment.shotCode,
        frameDependency: currentSegment.frameDependency,
        segment,
        shot,
        startFrame: {
          id: shotReference.startFrame.id,
          imageAssetPath: shotReference.startFrame.imageAssetPath,
          imageWidth: shotReference.startFrame.imageWidth,
          imageHeight: shotReference.startFrame.imageHeight,
        },
        endFrame:
          shotReference.frameDependency === "start_and_end_frame"
            ? {
                id: shotReference.endFrame.id,
                imageAssetPath: shotReference.endFrame.imageAssetPath,
                imageWidth: shotReference.endFrame.imageWidth,
                imageHeight: shotReference.endFrame.imageHeight,
              }
            : null,
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

function filterCurrentSegmentReferenceImagesForStrategy<
  T extends {
    order: number;
    sourceShotId?: string | null;
    frameRole?: "first_frame" | "last_frame" | null;
  },
>(referenceImages: T[], strategy: string | null | undefined): T[] {
  const filtered =
    strategy === "without_frame_refs"
      ? referenceImages.filter((referenceImage) => {
          if (referenceImage.frameRole) {
            return false;
          }

          return !referenceImage.sourceShotId;
        })
      : referenceImages;

  return filtered
    .sort((left, right) => left.order - right.order)
    .map((referenceImage, index) => ({
      ...referenceImage,
      order: index,
    }));
}
