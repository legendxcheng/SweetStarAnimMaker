import {
  createShotReferenceBatchRecord,
  createShotReferenceRecord,
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
import { isTaskStillActive } from "./task-reset-guard";

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
      let project: Awaited<ReturnType<typeof dependencies.projectRepository.findById>> = null;
      let currentShotScript: Awaited<
        ReturnType<typeof dependencies.shotScriptStorage.readCurrentShotScript>
      > | null = null;
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
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertImagesTaskInput(taskInput);
        project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
          storageDir: project.storageDir,
        });

        if (!currentShotScript || currentShotScript.id !== taskInput.sourceShotScriptId) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const segmentEntries = currentShotScript.segments.map((segment) => ({
          segment,
          frameDependency: deriveSegmentFrameDependency(segment),
        }));
        const totalRequiredFrameCount = segmentEntries.reduce(
          (count, { frameDependency }) =>
            count + (frameDependency === "start_and_end_frame" ? 2 : 1),
          0,
        );

        const batch = createShotReferenceBatchRecord({
          id: toShotImageBatchId(task.id),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceShotScriptId: taskInput.sourceShotScriptId,
          shotCount: segmentEntries.length,
          totalRequiredFrameCount,
          createdAt: startedAt,
          updatedAt: startedAt,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.shotImageRepository.insertBatch(batch);
        await dependencies.shotImageStorage.writeBatchManifest({ batch });
        const insertSegment = dependencies.shotImageRepository.insertSegment
          ? (segmentRecord: ReturnType<typeof createShotReferenceRecord>) =>
              dependencies.shotImageRepository.insertSegment!(segmentRecord)
          : dependencies.shotImageRepository.insertShot
            ? (segmentRecord: ReturnType<typeof createShotReferenceRecord>) =>
                dependencies.shotImageRepository.insertShot!(segmentRecord)
            : null;

        if (!insertSegment) {
          throw new Error("Shot image repository does not support segment image records");
        }

        for (const { segment, frameDependency } of segmentEntries) {
          if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
            return;
          }

          const representativeShot = segment.shots[0] ?? null;
          const segmentRecord = createShotReferenceRecord({
            id: toShotReferenceId(
              batch.id,
              segment.sceneId,
              segment.segmentId,
              segment.segmentId,
            ),
            batchId: batch.id,
            projectId: project.id,
            projectStorageDir: project.storageDir,
            sourceShotScriptId: currentShotScript.id,
            sceneId: segment.sceneId,
            segmentId: segment.segmentId,
            segmentOrder: segment.order,
            segmentName: segment.name,
            segmentSummary: segment.summary,
            sourceShotIds: segment.shots.map((shot) => shot.id),
            frameDependency,
            approvedAt: null,
            shotId: representativeShot?.id,
            shotCode: representativeShot?.shotCode,
            shotOrder: representativeShot?.order,
            durationSec: segment.durationSec ?? null,
            updatedAt: startedAt,
          });

          await insertSegment(segmentRecord);

          const requiredFrames = [
            segmentRecord.startFrame,
            ...(segmentRecord.endFrame ? [segmentRecord.endFrame] : []),
          ];

          for (const frame of requiredFrames) {
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
              shotId: representativeShot?.id,
              frameId: frame.id,
              sourceShotScriptId: currentShotScript.id,
              segmentId: segment.segmentId,
              sceneId: segment.sceneId,
              frameType: frame.frameType,
              sourceShotIds: segment.shots.map((shot) => shot.id),
              segmentSnapshot: segment,
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

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.projectRepository.updateCurrentImageBatch({
          projectId: project.id,
          batchId: batch.id,
        });
        didActivateBatch = true;

        const finishedAt = dependencies.clock.now();

        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "images_in_review",
          updatedAt: finishedAt,
        });

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
        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        if (project && !didActivateBatch) {
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: currentShotScript?.approvedAt ? "shot_script_approved" : "shot_script_in_review",
            updatedAt: finishedAt,
          });
        }

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

function toShotReferenceId(
  batchId: string,
  sceneId: string,
  segmentId: string,
  recordKey: string,
) {
  return `segment_img_${batchId}_${sceneId}_${segmentId}_${recordKey}`;
}

function deriveSegmentFrameDependency(segment: {
  shots: Array<{ frameDependency: "start_frame_only" | "start_and_end_frame" }>;
}) {
  return segment.shots.some((shot) => shot.frameDependency === "start_and_end_frame")
    ? "start_and_end_frame"
    : "start_frame_only";
}
