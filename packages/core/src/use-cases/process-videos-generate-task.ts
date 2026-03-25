import {
  createSegmentVideoRecord,
  createVideoBatchRecord,
} from "../domain/video";
import {
  createTaskRecord,
  segmentVideoGenerateQueueName,
  type SegmentVideoGenerateTaskInput,
  type VideosGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";

export interface ProcessVideosGenerateTaskInput {
  taskId: string;
}

export interface ProcessVideosGenerateTaskUseCase {
  execute(input: ProcessVideosGenerateTaskInput): Promise<void>;
}

export interface ProcessVideosGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotImageRepository: ShotImageRepository;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createProcessVideosGenerateTaskUseCase(
  dependencies: ProcessVideosGenerateTaskUseCaseDependencies,
): ProcessVideosGenerateTaskUseCase {
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

      const taskInput = (await dependencies.taskFileStorage.readTaskInput({
        task,
      })) as VideosGenerateTaskInput;
      const project = await dependencies.projectRepository.findById(task.projectId);

      if (!project) {
        throw new ProjectNotFoundError(task.projectId);
      }

      const frames = await dependencies.shotImageRepository.listFramesByBatchId(
        taskInput.sourceImageBatchId,
      );
      const batch = createVideoBatchRecord({
        id: `video_batch_${task.id}`,
        projectId: project.id,
        projectStorageDir: project.storageDir,
        sourceImageBatchId: taskInput.sourceImageBatchId,
        sourceShotScriptId: taskInput.sourceShotScriptId,
        segmentCount: taskInput.shotScript.segments.length,
        createdAt: startedAt,
        updatedAt: startedAt,
      });

      await dependencies.videoRepository.insertBatch(batch);
      await dependencies.videoStorage.writeBatchManifest({ batch });

      for (const segment of taskInput.shotScript.segments) {
        const startFrame = frames.find(
          (frame) =>
            frame.segmentId === segment.segmentId &&
            frame.sceneId === segment.sceneId &&
            frame.frameType === "start_frame",
        );
        const endFrame = frames.find(
          (frame) =>
            frame.segmentId === segment.segmentId &&
            frame.sceneId === segment.sceneId &&
            frame.frameType === "end_frame",
        );

        if (!startFrame || !endFrame) {
          throw new Error(`Approved frame pair missing for segment ${segment.segmentId}`);
        }

        const videoRecord = createSegmentVideoRecord({
          id: `video_${batch.id}_${segment.sceneId}_${segment.segmentId}`,
          batchId: batch.id,
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceImageBatchId: taskInput.sourceImageBatchId,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          segmentId: segment.segmentId,
          sceneId: segment.sceneId,
          order: segment.order,
          status: "generating",
          updatedAt: startedAt,
        });
        await dependencies.videoRepository.insertSegment(videoRecord);

        const segmentTask = createTaskRecord({
          id: dependencies.taskIdGenerator.generateTaskId(),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          type: "segment_video_generate",
          queueName: segmentVideoGenerateQueueName,
          createdAt: startedAt,
        });
        const segmentTaskInput: SegmentVideoGenerateTaskInput = {
          taskId: segmentTask.id,
          projectId: project.id,
          taskType: "segment_video_generate",
          batchId: batch.id,
          sourceImageBatchId: taskInput.sourceImageBatchId,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          segmentId: segment.segmentId,
          sceneId: segment.sceneId,
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

        await dependencies.taskRepository.insert(segmentTask);
        await dependencies.taskFileStorage.createTaskArtifacts({
          task: segmentTask,
          input: segmentTaskInput,
        });
        await dependencies.taskQueue.enqueue({
          taskId: segmentTask.id,
          queueName: segmentTask.queueName,
          taskType: segmentTask.type,
        });
      }

      await dependencies.projectRepository.updateCurrentVideoBatch?.({
        projectId: project.id,
        batchId: batch.id,
      });
      const finishedAt = dependencies.clock.now();
      await dependencies.taskFileStorage.writeTaskOutput({
        task,
        output: {
          batchId: batch.id,
          segmentCount: batch.segmentCount,
        },
      });
      await dependencies.taskRepository.markSucceeded({
        taskId: task.id,
        updatedAt: finishedAt,
        finishedAt,
      });
    },
  };
}
