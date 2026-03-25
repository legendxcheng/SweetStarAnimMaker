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

      const frames = await dependencies.shotImageRepository.listFramesByBatchId(
        currentSegment.sourceImageBatchId,
      );
      const startFrame = frames.find(
        (frame) =>
          frame.sceneId === currentSegment.sceneId &&
          frame.segmentId === currentSegment.segmentId &&
          frame.frameType === "start_frame",
      );
      const endFrame = frames.find(
        (frame) =>
          frame.sceneId === currentSegment.sceneId &&
          frame.segmentId === currentSegment.segmentId &&
          frame.frameType === "end_frame",
      );

      if (!startFrame || !endFrame) {
        throw new Error(`Approved frame pair missing for video ${input.videoId}`);
      }

      const timestamp = dependencies.clock.now();
      await dependencies.videoRepository.updateSegment({
        ...currentSegment,
        status: "generating",
        approvedAt: null,
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
        segment,
        startFrame: {
          id: startFrame.id,
          imageAssetPath: startFrame.imageAssetPath,
          imageWidth: startFrame.imageWidth,
          imageHeight: startFrame.imageHeight,
        },
        endFrame: {
          id: endFrame.id,
          imageAssetPath: endFrame.imageAssetPath,
          imageWidth: endFrame.imageWidth,
          imageHeight: endFrame.imageHeight,
        },
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
