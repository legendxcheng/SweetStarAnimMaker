import {
  createSegmentVideoRecord,
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
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoStorage } from "../ports/video-storage";
import { buildSegmentVideoReferences } from "./build-segment-video-references";
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
  characterSheetRepository: CharacterSheetRepository;
  sceneSheetRepository: SceneSheetRepository;
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
        const characterSheets = project.currentCharacterSheetBatchId
          ? await dependencies.characterSheetRepository.listCharactersByBatchId(
              project.currentCharacterSheetBatchId,
            )
          : [];
        const sceneSheets = project.currentSceneSheetBatchId
          ? await dependencies.sceneSheetRepository.listScenesByBatchId(
              project.currentSceneSheetBatchId,
            )
          : [];
        const batch = createVideoBatchRecord({
          id: `video_batch_${task.id}`,
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceImageBatchId: taskInput.sourceImageBatchId,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          segmentCount:
            taskInput.imageBatch.segmentCount ?? taskInput.shotScript.segments.length,
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
          if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
            return;
          }

          const segmentShotReferences = shots.filter(
            (item) => item.sceneId === segment.sceneId && item.segmentId === segment.segmentId,
          );

          if (segmentShotReferences.length === 0) {
            throw new Error(`Approved references missing for segment ${segment.segmentId}`);
          }

          const representativeShot = segment.shots[0];
          if (!representativeShot) {
            throw new Error(`Segment ${segment.segmentId} has no shots`);
          }

          const representativeShotReference = segmentShotReferences.find(
            (item) => item.shotId === representativeShot.id,
          );

          if (!representativeShotReference) {
            throw new Error(`Approved reference missing for shot ${representativeShot.id}`);
          }

          const referenceImages = buildSegmentVideoReferences({
            strategy: taskInput.videoReferenceStrategy,
            segment,
            shotReferences: segmentShotReferences,
          });
          const videoRecord = createSegmentVideoRecord({
            id: `video_${batch.id}_${segment.sceneId}_${segment.segmentId}`,
            batchId: batch.id,
            projectId: project.id,
            projectStorageDir: project.storageDir,
            sourceImageBatchId: taskInput.sourceImageBatchId,
            sourceShotScriptId: taskInput.sourceShotScriptId,
            sceneId: segment.sceneId,
            segmentId: segment.segmentId,
            segmentOrder: segment.order,
            segmentName: segment.name,
            segmentSummary: segment.summary,
            shotCount: segment.shots.length,
            sourceShotIds: segment.shots.map((shot) => shot.id),
            status: "generating",
            promptTextSeed: "",
            promptTextCurrent: "",
            promptUpdatedAt: startedAt,
            referenceImages,
            referenceAudios: [],
            durationSec: segment.durationSec ?? null,
            updatedAt: startedAt,
            shotId: representativeShot.id,
            shotCode: representativeShot.shotCode,
            shotOrder: representativeShot.order,
            frameDependency: representativeShot.frameDependency,
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
              segmentId: segment.segmentId,
              sceneId: segment.sceneId,
              segmentOrder: segment.order,
              segmentName: segment.name,
              segmentSummary: segment.summary,
              shotCount: segment.shots.length,
              sourceShotIds: segment.shots.map((shot) => shot.id),
              shotId: representativeShot.id,
              shotCode: representativeShot.shotCode,
              frameDependency: representativeShot.frameDependency,
              segment,
              shots: segment.shots,
              shot: representativeShot,
              referenceImages,
              referenceAudios: [],
              startFrame: {
                id: representativeShotReference.startFrame.id,
                imageAssetPath: representativeShotReference.startFrame.imageAssetPath,
                imageWidth: representativeShotReference.startFrame.imageWidth,
                imageHeight: representativeShotReference.startFrame.imageHeight,
              },
              endFrame: representativeShotReference.endFrame
                ? {
                    id: representativeShotReference.endFrame.id,
                    imageAssetPath: representativeShotReference.endFrame.imageAssetPath,
                    imageWidth: representativeShotReference.endFrame.imageWidth,
                    imageHeight: representativeShotReference.endFrame.imageHeight,
                  }
                : null,
              promptTemplateKey: "segment_video.generate",
            },
          });
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
            segmentCount: segmentTasks.length,
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
