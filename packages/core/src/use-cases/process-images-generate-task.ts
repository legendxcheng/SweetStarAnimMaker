import {
  createSegmentFrameRecord,
  createShotImageBatchRecord,
} from "../domain/shot-image";
import {
  createTaskRecord,
  framePromptGenerateQueueName,
  type FramePromptGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";

export interface ProcessImagesGenerateTaskInput {
  taskId: string;
}

export interface ProcessImagesGenerateTaskUseCase {
  execute(input: ProcessImagesGenerateTaskInput): Promise<void>;
}

export interface ProcessImagesGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotScriptStorage: ShotScriptStorage;
  shotImageRepository: ShotImageRepository;
  shotImageStorage: ShotImageStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createProcessImagesGenerateTaskUseCase(
  dependencies: ProcessImagesGenerateTaskUseCaseDependencies,
): ProcessImagesGenerateTaskUseCase {
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
        assertImagesTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
          storageDir: project.storageDir,
        });

        if (!currentShotScript || currentShotScript.id !== taskInput.sourceShotScriptId) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const batch = createShotImageBatchRecord({
          id: toShotImageBatchId(task.id),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          segmentCount: currentShotScript.segments.length,
          createdAt: startedAt,
          updatedAt: startedAt,
        });

        await dependencies.shotImageRepository.insertBatch(batch);
        await dependencies.shotImageStorage.writeBatchManifest({ batch });
        await dependencies.projectRepository.updateCurrentImageBatch({
          projectId: project.id,
          batchId: batch.id,
        });

        for (const segment of currentShotScript.segments) {
          for (const frameType of ["start_frame", "end_frame"] as const) {
            const frame = createSegmentFrameRecord({
              id: toSegmentFrameId(segment.segmentId, frameType),
              batchId: batch.id,
              projectId: project.id,
              projectStorageDir: project.storageDir,
              sourceShotScriptId: currentShotScript.id,
              segmentId: segment.segmentId,
              sceneId: segment.sceneId,
              order: segment.order,
              frameType,
              updatedAt: startedAt,
            });

            await dependencies.shotImageRepository.insertFrame(frame);

            const framePromptTask = createTaskRecord({
              id: dependencies.taskIdGenerator.generateTaskId(),
              projectId: project.id,
              projectStorageDir: project.storageDir,
              type: "frame_prompt_generate",
              queueName: framePromptGenerateQueueName,
              createdAt: startedAt,
            });
            const framePromptTaskInput: FramePromptGenerateTaskInput = {
              taskId: framePromptTask.id,
              projectId: project.id,
              taskType: "frame_prompt_generate",
              batchId: batch.id,
              frameId: frame.id,
              sourceShotScriptId: currentShotScript.id,
              segmentId: segment.segmentId,
              sceneId: segment.sceneId,
              frameType,
            };

            await dependencies.taskRepository.insert(framePromptTask);
            await dependencies.taskFileStorage.createTaskArtifacts({
              task: framePromptTask,
              input: framePromptTaskInput,
            });
            await dependencies.taskQueue.enqueue({
              taskId: framePromptTask.id,
              queueName: framePromptTask.queueName,
              taskType: framePromptTask.type,
            });
          }
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            batchId: batch.id,
            frameCount: batch.totalFrameCount,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "images batch succeeded",
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
          message: `images batch failed: ${errorMessage}`,
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

function assertImagesTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "images_generate";
  sourceShotScriptId: string;
} {
  if (input.taskType !== "images_generate") {
    throw new Error(`Unsupported task input for images processing: ${input.taskType}`);
  }
}

function toShotImageBatchId(taskId: string) {
  return `image_batch_${taskId}`;
}

function toSegmentFrameId(segmentId: string, frameType: "start_frame" | "end_frame") {
  const token = frameType === "start_frame" ? "start" : "end";
  return `frame_${segmentId}_${token}`;
}
