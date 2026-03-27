import {
  createTaskRecord,
  framePromptGenerateQueueName,
  type FramePromptGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";

export interface RegenerateFailedFramePromptsInput {
  projectId: string;
}

export interface RegenerateFailedFramePromptsResult {
  batchId: string;
  frameCount: number;
  taskIds: string[];
}

export interface RegenerateFailedFramePromptsUseCase {
  execute(
    input: RegenerateFailedFramePromptsInput,
  ): Promise<RegenerateFailedFramePromptsResult>;
}

export interface RegenerateFailedFramePromptsUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateFailedFramePromptsUseCase(
  dependencies: RegenerateFailedFramePromptsUseCaseDependencies,
): RegenerateFailedFramePromptsUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentImageBatchId) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const shots = dependencies.shotImageRepository.listShotsByBatchId
        ? await dependencies.shotImageRepository.listShotsByBatchId(project.currentImageBatchId)
        : null;
      const failedFrames =
        shots
          ?.flatMap((shot) => [shot.startFrame, ...(shot.endFrame ? [shot.endFrame] : [])])
          .filter((frame) => frame.planStatus === "plan_failed") ??
        (await dependencies.shotImageRepository.listFramesByBatchId(project.currentImageBatchId))
          .filter((frame) => frame.planStatus === "plan_failed");
      const timestamp = dependencies.clock.now();
      const taskIds: string[] = [];

      for (const frame of failedFrames) {
        const updatedFrame = {
          ...frame,
          planStatus: "pending" as const,
          updatedAt: timestamp,
        };
        const owningShot = shots?.find(
          (shot) => shot.startFrame.id === frame.id || shot.endFrame?.id === frame.id,
        );

        await dependencies.shotImageRepository.updateFrame(updatedFrame);

        const task = createTaskRecord({
          id: dependencies.taskIdGenerator.generateTaskId(),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          type: "frame_prompt_generate",
          queueName: framePromptGenerateQueueName,
          createdAt: timestamp,
        });
        const taskInput: FramePromptGenerateTaskInput = {
          taskId: task.id,
          projectId: project.id,
          taskType: "frame_prompt_generate",
          batchId: frame.batchId,
          shotId: owningShot?.shotId,
          frameId: frame.id,
          sourceShotScriptId: frame.sourceShotScriptId,
          segmentId: owningShot?.segmentId ?? frame.segmentId,
          sceneId: owningShot?.sceneId ?? frame.sceneId,
          frameType: frame.frameType,
        };

        await dependencies.taskRepository.insert(task);
        await dependencies.taskFileStorage.createTaskArtifacts({
          task,
          input: taskInput,
        });
        await dependencies.taskQueue.enqueue({
          taskId: task.id,
          queueName: task.queueName,
          taskType: task.type,
        });
        taskIds.push(task.id);
      }

      return {
        batchId: project.currentImageBatchId,
        frameCount: failedFrames.length,
        taskIds,
      };
    },
  };
}
