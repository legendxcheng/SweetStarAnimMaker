import {
  type SegmentVideoPromptGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";
import { deriveProjectVideoStatus } from "./derive-project-video-status";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessSegmentVideoPromptGenerateTaskInput {
  taskId: string;
}

export interface ProcessSegmentVideoPromptGenerateTaskUseCase {
  execute(input: ProcessSegmentVideoPromptGenerateTaskInput): Promise<void>;
}

export interface ProcessSegmentVideoPromptGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotScriptStorage?: ShotScriptStorage;
  shotImageRepository?: ShotImageRepository;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  videoPromptProvider: VideoPromptProvider;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createProcessSegmentVideoPromptGenerateTaskUseCase(
  dependencies: ProcessSegmentVideoPromptGenerateTaskUseCaseDependencies,
): ProcessSegmentVideoPromptGenerateTaskUseCase {
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

      let project: Awaited<ReturnType<ProjectRepository["findById"]>> | null = null;
      let currentSegment:
        | Awaited<ReturnType<VideoRepository["findCurrentSegmentByProjectIdAndSegmentId"]>>
        | null = null;

      try {
        const taskInput = (await dependencies.taskFileStorage.readTaskInput({
          task,
        })) as SegmentVideoPromptGenerateTaskInput;
        project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        currentSegment =
          (await dependencies.videoRepository.findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId?.(
            project.id,
            taskInput.sceneId,
            taskInput.segmentId,
            taskInput.shotId,
          )) ??
          (await dependencies.videoRepository.findCurrentSegmentByProjectIdAndSceneIdAndSegmentId(
            project.id,
            taskInput.sceneId,
            taskInput.segmentId,
          ));

        if (!currentSegment) {
          throw new SegmentVideoNotFoundError(taskInput.shotId);
        }

        const promptPlan = await dependencies.videoPromptProvider.generateVideoPrompt(
          buildVideoPromptProviderInput({
            projectId: project.id,
            segment: taskInput.segment,
            shots: taskInput.shots ?? taskInput.segment.shots,
            referenceImages: currentSegment.referenceImages,
            referenceAudios: currentSegment.referenceAudios,
          }),
        );

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const promptUpdatedAt = startedAt;
        const updatedSegment = {
          ...currentSegment,
          status: "in_review" as const,
          promptTextSeed: promptPlan.finalPrompt,
          promptTextCurrent: promptPlan.finalPrompt,
          promptUpdatedAt,
          updatedAt: promptUpdatedAt,
        };

        await dependencies.videoRepository.updateSegment(updatedSegment);
        await dependencies.videoStorage.writePromptPlan({
          segment: updatedSegment,
          planning: {
            finalPrompt: promptPlan.finalPrompt,
            dialoguePlan: promptPlan.dialoguePlan,
            audioPlan: promptPlan.audioPlan,
            visualGuardrails: promptPlan.visualGuardrails,
            rationale: promptPlan.rationale,
            provider: promptPlan.provider,
            model: promptPlan.model,
            rawResponse: promptPlan.rawResponse,
          },
        });

        const finishedAt = dependencies.clock.now();
        const segments = await dependencies.videoRepository.listSegmentsByBatchId(currentSegment.batchId);
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: deriveProjectVideoStatus(segments, updatedSegment),
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            segmentId: taskInput.segmentId,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "segment video prompt generation succeeded",
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
          message: `segment video prompt generation failed: ${errorMessage}`,
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
