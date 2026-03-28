import {
  createShotVideoRecord,
  createVideoBatchRecord,
} from "../domain/video";
import {
  createTaskRecord,
  segmentVideoPromptGenerateQueueName,
  type SegmentVideoPromptGenerateTaskInput,
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
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoStorage } from "../ports/video-storage";
import { isTaskStillActive } from "./task-reset-guard";

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
  videoPromptProvider: VideoPromptProvider;
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
      let project: Awaited<ReturnType<typeof dependencies.projectRepository.findById>> = null;
      let didActivateBatch = false;

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
        const taskInput = (await dependencies.taskFileStorage.readTaskInput({
          task,
        })) as VideosGenerateTaskInput;
        project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        if (!dependencies.shotImageRepository.listShotsByBatchId) {
          throw new Error("Shot reference records are required before generating videos");
        }

        const shots = await dependencies.shotImageRepository.listShotsByBatchId(
          taskInput.sourceImageBatchId,
        );
        const batch = createVideoBatchRecord({
          id: `video_batch_${task.id}`,
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceImageBatchId: taskInput.sourceImageBatchId,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          shotCount:
            taskInput.imageBatch.shotCount ??
            taskInput.shotScript.segments.reduce((total, segment) => total + segment.shots.length, 0),
          createdAt: startedAt,
          updatedAt: startedAt,
        });
        const segmentTasks: Array<{
          task: ReturnType<typeof createTaskRecord>;
          input: SegmentVideoPromptGenerateTaskInput;
        }> = [];

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.videoRepository.insertBatch(batch);
        await dependencies.videoStorage.writeBatchManifest({ batch });

        for (const segment of taskInput.shotScript.segments) {
          for (const shot of segment.shots) {
            if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
              return;
            }

            const shotReference = shots.find(
              (item) =>
                item.sceneId === shot.sceneId &&
                item.segmentId === shot.segmentId &&
                item.shotId === shot.id,
            );

            if (!shotReference) {
              throw new Error(`Approved reference missing for shot ${shot.id}`);
            }

            const videoRecord = createShotVideoRecord({
              id: `video_${batch.id}_${shot.sceneId}_${shot.segmentId}_${shot.id}`,
              batchId: batch.id,
              projectId: project.id,
              projectStorageDir: project.storageDir,
              sourceImageBatchId: taskInput.sourceImageBatchId,
              sourceShotScriptId: taskInput.sourceShotScriptId,
              shotId: shot.id,
              shotCode: shot.shotCode,
              sceneId: shot.sceneId,
              segmentId: shot.segmentId,
              segmentOrder: segment.order,
              shotOrder: shot.order,
              frameDependency: shot.frameDependency,
              status: "generating",
              promptTextSeed: "",
              promptTextCurrent: "",
              promptUpdatedAt: startedAt,
              durationSec: shot.durationSec ?? null,
              updatedAt: startedAt,
            });

            await dependencies.videoRepository.insertSegment(videoRecord);

            const segmentTask = createTaskRecord({
              id: dependencies.taskIdGenerator.generateTaskId(),
              projectId: project.id,
              projectStorageDir: project.storageDir,
              type: "segment_video_prompt_generate",
              queueName: segmentVideoPromptGenerateQueueName,
              createdAt: startedAt,
            });
            segmentTasks.push({
              task: segmentTask,
              input: {
                taskId: segmentTask.id,
                projectId: project.id,
                taskType: "segment_video_prompt_generate",
                batchId: batch.id,
                sourceImageBatchId: taskInput.sourceImageBatchId,
                sourceShotScriptId: taskInput.sourceShotScriptId,
                segmentId: shot.segmentId,
                sceneId: shot.sceneId,
                shotId: shot.id,
                shotCode: shot.shotCode,
                frameDependency: shot.frameDependency,
                segment,
                shot,
                startFrame: {
                  id: shotReference.startFrame.id,
                  imageAssetPath: shotReference.startFrame.imageAssetPath,
                  imageWidth: shotReference.startFrame.imageWidth,
                  imageHeight: shotReference.startFrame.imageHeight,
                },
                endFrame: shotReference.endFrame
                  ? {
                      id: shotReference.endFrame.id,
                      imageAssetPath: shotReference.endFrame.imageAssetPath,
                      imageWidth: shotReference.endFrame.imageWidth,
                      imageHeight: shotReference.endFrame.imageHeight,
                    }
                  : null,
                promptTemplateKey: "segment_video.generate",
              },
            });
          }
        }

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.projectRepository.updateCurrentVideoBatch?.({
          projectId: project.id,
          batchId: batch.id,
        });
        didActivateBatch = true;

        for (const segmentTask of segmentTasks) {
          await dependencies.taskRepository.insert(segmentTask.task);
          await dependencies.taskFileStorage.createTaskArtifacts({
            task: segmentTask.task,
            input: segmentTask.input,
          });
          await dependencies.taskQueue.enqueue({
            taskId: segmentTask.task.id,
            queueName: segmentTask.task.queueName,
            taskType: segmentTask.task.type,
          });
        }

        const finishedAt = dependencies.clock.now();
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            batchId: batch.id,
            shotCount: segmentTasks.length,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "videos batch orchestration succeeded",
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

        if (project && !didActivateBatch) {
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: "images_approved",
            updatedAt: finishedAt,
          });
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `videos batch failed: ${errorMessage}`,
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
