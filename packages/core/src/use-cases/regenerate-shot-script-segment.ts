import {
  toShotScriptSegmentStorageKey,
  type TaskDetail,
} from "@sweet-star/shared";

import {
  createTaskRecord,
  shotScriptSegmentGenerateQueueName,
  type ShotScriptSegmentGenerateTaskInput,
} from "../domain/task";
import {
  createShotScriptReviewId,
  createShotScriptReviewRecord,
} from "../domain/shot-script-review";
import { mergeShotScriptSegment } from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import {
  CurrentShotScriptNotFoundError,
  CurrentStoryboardNotFoundError,
} from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { requireSceneId, resolveShotScriptSegment } from "./resolve-shot-script-segment";
import { toTaskDetailDto } from "./task-detail-dto";

export interface RegenerateShotScriptSegmentInput {
  projectId: string;
  segmentId: string;
  reason?: string;
}

export interface RegenerateShotScriptSegmentUseCase {
  execute(input: RegenerateShotScriptSegmentInput): Promise<TaskDetail>;
}

export interface RegenerateShotScriptSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateShotScriptSegmentUseCase(
  dependencies: RegenerateShotScriptSegmentUseCaseDependencies,
): RegenerateShotScriptSegmentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const [currentStoryboard, currentShotScript] = await Promise.all([
        dependencies.storyboardStorage.readCurrentStoryboard({
          storageDir: project.storageDir,
        }),
        dependencies.shotScriptStorage.readCurrentShotScript({
          storageDir: project.storageDir,
        }),
      ]);

      if (!currentStoryboard) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      if (!currentShotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const { selector, segment: currentSegment } = resolveShotScriptSegment(
        currentShotScript.segments,
        input.segmentId,
      );
      const sceneId = requireSceneId(selector, currentSegment.sceneId);
      const matchedScene = currentStoryboard.scenes.find((scene) => scene.id === sceneId);
      const matchedSegment = matchedScene?.segments.find(
        (segment) => segment.id === currentSegment.segmentId,
      );

      if (!matchedScene || !matchedSegment) {
        throw new Error(`Shot script segment not found: ${input.segmentId}`);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "shot_script_segment_generate",
        queueName: shotScriptSegmentGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: ShotScriptSegmentGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "shot_script_segment_generate",
        sourceStoryboardId: currentStoryboard.id,
        sourceShotScriptId: currentShotScript.id,
        sceneId: matchedScene.id,
        segmentId: matchedSegment.id,
        scene: {
          id: matchedScene.id,
          order: matchedScene.order,
          name: matchedScene.name,
          dramaticPurpose: matchedScene.dramaticPurpose,
        },
        segment: matchedSegment,
        storyboardTitle: currentStoryboard.title,
        episodeTitle: currentStoryboard.episodeTitle,
        promptTemplateKey: "shot_script.segment.generate",
      };

      await dependencies.taskRepository.insert(task);

      try {
        await dependencies.taskFileStorage.createTaskArtifacts({
          task,
          input: taskInput,
        });
      } catch (error) {
        await dependencies.taskRepository.delete(task.id);
        throw error;
      }

      const updatedShotScript = mergeShotScriptSegment(
        currentShotScript,
        {
          ...currentSegment,
          status: "generating",
          approvedAt: null,
        },
        timestamp,
      );

      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript: updatedShotScript,
      });
      await dependencies.shotScriptReviewRepository.insert(
        createShotScriptReviewRecord({
          id: createShotScriptReviewId(
            currentShotScript.id,
            toShotScriptSegmentStorageKey(currentSegment),
            "regenerate",
          ),
          projectId: project.id,
          shotScriptId: currentShotScript.id,
          action: "reject",
          reason: input.reason ?? null,
          nextAction: "regenerate",
          triggeredTaskId: task.id,
          createdAt: timestamp,
        }),
      );

      try {
        await dependencies.taskQueue.enqueue({
          taskId: task.id,
          queueName: task.queueName,
          taskType: task.type,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: deriveShotScriptProjectStatus(updatedShotScript),
          updatedAt: timestamp,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Task enqueue failed";

        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage: message,
          updatedAt: timestamp,
          finishedAt: timestamp,
        });
        throw error;
      }

      return toTaskDetailDto(task);
    },
  };
}

function deriveShotScriptProjectStatus(shotScript: {
  approvedAt: string | null;
  segments: Array<{
    status: "pending" | "generating" | "in_review" | "approved";
  }>;
}) {
  if (shotScript.approvedAt) {
    return "shot_script_approved" as const;
  }

  if (shotScript.segments.some((segment) => segment.status === "in_review")) {
    return "shot_script_in_review" as const;
  }

  return "shot_script_generating" as const;
}
