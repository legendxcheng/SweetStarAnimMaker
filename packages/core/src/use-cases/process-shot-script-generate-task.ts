import type { CurrentShotScript } from "@sweet-star/shared";

import { createShotScriptShell, toCurrentShotScriptSummary } from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptProvider } from "../ports/shot-script-provider";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { isTaskStillActive } from "./task-reset-guard";
import {
  createTaskRecord,
  shotScriptSegmentGenerateQueueName,
  type ShotScriptSegmentGenerateTaskInput,
} from "../domain/task";

export interface ProcessShotScriptGenerateTaskInput {
  taskId: string;
}

export interface ProcessShotScriptGenerateTaskUseCase {
  execute(input: ProcessShotScriptGenerateTaskInput): Promise<void>;
}

export interface ProcessShotScriptGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotScriptProvider: ShotScriptProvider;
  shotScriptStorage: ShotScriptStorage;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  clock: Clock;
}

export function createProcessShotScriptGenerateTaskUseCase(
  dependencies: ProcessShotScriptGenerateTaskUseCaseDependencies,
): ProcessShotScriptGenerateTaskUseCase {
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
        assertShotScriptTaskInput(taskInput);

        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        if (taskInput.promptTemplateKey === "shot_script.segment.generate") {
          if (!dependencies.taskQueue || !dependencies.taskIdGenerator) {
            throw new Error("Segment-first shot script processing requires taskQueue and taskIdGenerator");
          }

          const existingShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
            storageDir: project.storageDir,
          });
          const reusableShotScript =
            taskInput.preserveApprovedSegments !== false &&
            existingShotScript?.sourceStoryboardId === taskInput.sourceStoryboardId
              ? existingShotScript
              : null;
          const shotScript = createShotScriptShell({
            id: `shot_script_${task.id}`,
            sourceStoryboardId: taskInput.sourceStoryboardId,
            sourceTaskId: task.id,
            storyboard: taskInput.storyboard,
            updatedAt: startedAt,
            currentShotScript: reusableShotScript,
          });
          const preservedApprovedSegments = new Set(
            shotScript.segments
              .filter((segment) => segment.status === "approved")
              .map((segment) => `${segment.sceneId}:${segment.segmentId}`),
          );

          if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
            return;
          }

          await dependencies.shotScriptStorage.writeCurrentShotScript({
            storageDir: project.storageDir,
            shotScript,
          });
          await dependencies.projectRepository.updateCurrentShotScript({
            projectId: project.id,
            shotScriptId: shotScript.id,
          });

          for (const scene of taskInput.storyboard.scenes) {
            const sceneSegmentCount = scene.segments.length;

            for (const [segmentIndex, segment] of scene.segments.entries()) {
              if (preservedApprovedSegments.has(`${scene.id}:${segment.id}`)) {
                continue;
              }

              if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
                return;
              }

              const segmentTask = createTaskRecord({
                id: dependencies.taskIdGenerator.generateTaskId(),
                projectId: project.id,
                projectStorageDir: project.storageDir,
                type: "shot_script_segment_generate",
                queueName: shotScriptSegmentGenerateQueueName,
                createdAt: startedAt,
              });
              const segmentTaskInput: ShotScriptSegmentGenerateTaskInput = {
                taskId: segmentTask.id,
                projectId: project.id,
                taskType: "shot_script_segment_generate",
                sourceStoryboardId: taskInput.sourceStoryboardId,
                sourceShotScriptId: shotScript.id,
                sceneId: scene.id,
                segmentId: segment.id,
                segment: toShotScriptSegmentSnapshot(segment),
                scene: {
                  id: scene.id,
                  order: scene.order,
                  name: scene.name,
                  dramaticPurpose: scene.dramaticPurpose,
                },
                storyboardTitle: taskInput.storyboard.title,
                episodeTitle: taskInput.storyboard.episodeTitle,
                sourceMasterPlotId: taskInput.sourceMasterPlotId,
                masterPlot: taskInput.masterPlot,
                sourceCharacterSheetBatchId: taskInput.sourceCharacterSheetBatchId,
                characterSheets: taskInput.characterSheets,
                previousSegment:
                  scene.segments[segmentIndex - 1] === undefined
                    ? null
                    : toShotScriptSegmentSnapshot(scene.segments[segmentIndex - 1]),
                nextSegment:
                  scene.segments[segmentIndex + 1] === undefined
                    ? null
                    : toShotScriptSegmentSnapshot(scene.segments[segmentIndex + 1]),
                sceneSegmentIndex: segmentIndex + 1,
                sceneSegmentCount,
                previousShotScriptSummary: buildPreviousShotScriptSummary({
                  shotScript: reusableShotScript,
                  sceneId: scene.id,
                  previousStoryboardSegmentId: scene.segments[segmentIndex - 1]?.id ?? null,
                }),
                promptTemplateKey: "shot_script.segment.generate",
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
          }

          if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
            return;
          }

          const finishedAt = dependencies.clock.now();
          await dependencies.taskFileStorage.writeTaskOutput({
            task,
            output: {
              shotScriptId: shotScript.id,
              segmentCount: shotScript.segmentCount,
            },
          });
          await dependencies.taskFileStorage.appendTaskLog({
            task,
            message: "shot script batch orchestration succeeded",
          });
          await dependencies.taskRepository.markSucceeded({
            taskId: task.id,
            updatedAt: finishedAt,
            finishedAt,
          });
          return;
        }

        const promptTemplate = await dependencies.shotScriptStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.promptTemplateKey,
        });
        const promptVariables = {
          storyboard: taskInput.storyboard,
          masterPlot: taskInput.masterPlot,
          characterSheets: taskInput.characterSheets ?? [],
        };
        const promptText = renderTemplate(promptTemplate, promptVariables);

        await dependencies.shotScriptStorage.writePromptSnapshot({
          taskStorageDir: task.storageDir,
          promptText,
          promptVariables,
        });

        if (!dependencies.shotScriptProvider.generateShotScript) {
          throw new Error("Shot script provider does not support batch shot script generation");
        }

        const providerResult = await dependencies.shotScriptProvider.generateShotScript({
          promptText,
          variables: promptVariables,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.shotScriptStorage.writeRawResponse({
          taskStorageDir: task.storageDir,
          rawResponse: providerResult.rawResponse,
        });

        const shotScript = {
          ...providerResult.shotScript,
          sourceStoryboardId: taskInput.sourceStoryboardId,
          sourceTaskId: task.id,
          updatedAt: finishedAt,
          approvedAt: null,
        } as CurrentShotScript;
        const summary = toCurrentShotScriptSummary(shotScript);

        await dependencies.shotScriptStorage.writeCurrentShotScript({
          storageDir: project.storageDir,
          shotScript,
        });
        await dependencies.projectRepository.updateCurrentShotScript({
          projectId: project.id,
          shotScriptId: shotScript.id,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "shot_script_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            shotScriptId: shotScript.id,
            shotCount: summary.shotCount,
            totalDurationSec: summary.totalDurationSec,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "shot script generation succeeded",
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
          message: `shot script generation failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: task.projectId,
          status: "storyboard_approved",
          updatedAt: finishedAt,
        });

        throw error;
      }
    },
  };
}

function toShotScriptSegmentSnapshot(segment: {
  id: string;
  order: number;
  durationSec: number | null;
  visual: string;
  characterAction: string;
  dialogue: string;
  voiceOver: string;
  audio: string;
  purpose: string;
}) {
  return {
    id: segment.id,
    order: segment.order,
    durationSec: segment.durationSec,
    visual: segment.visual,
    characterAction: segment.characterAction,
    dialogue: segment.dialogue,
    voiceOver: segment.voiceOver,
    audio: segment.audio,
    purpose: segment.purpose,
  };
}

function buildPreviousShotScriptSummary(input: {
  shotScript: CurrentShotScript | null;
  sceneId: string;
  previousStoryboardSegmentId: string | null;
}) {
  if (!input.shotScript || !input.previousStoryboardSegmentId) {
    return null;
  }

  const previousSegment = input.shotScript.segments.find(
    (segment) =>
      segment.sceneId === input.sceneId && segment.segmentId === input.previousStoryboardSegmentId,
  );

  if (!previousSegment) {
    return null;
  }

  const lastShot = previousSegment.shots.at(-1) ?? null;

  return {
    summary: previousSegment.summary,
    lastShotVisual: lastShot?.visual ?? null,
    lastShotAction: lastShot?.action ?? null,
  };
}

function assertShotScriptTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
  preserveApprovedSegments?: boolean;
  sourceMasterPlotId?: string;
  sourceCharacterSheetBatchId?: string;
  storyboard: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
    scenes: Array<{
      id: string;
      order: number;
      name: string;
      dramaticPurpose: string;
      segments: Array<{
        id: string;
        order: number;
        durationSec: number | null;
        visual: string;
        characterAction: string;
        dialogue: string;
        voiceOver: string;
        audio: string;
        purpose: string;
      }>;
    }>;
  };
  masterPlot?: {
    id: string;
    title: string | null;
    logline: string;
    synopsis: string;
    mainCharacters: string[];
    coreConflict: string;
    emotionalArc: string;
    endingBeat: string;
    targetDurationSec: number | null;
  };
  characterSheets?: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath?: string | null;
  }>;
  promptTemplateKey: "shot_script.generate" | "shot_script.segment.generate";
} {
  if (input.taskType !== "shot_script_generate") {
    throw new Error(`Unsupported task input for shot script processing: ${input.taskType}`);
  }
}

function renderTemplate(template: string, variables: Record<string, unknown>) {
  return template.replaceAll(/\{\{([^}]+)\}\}/g, (_, rawPath: string) => {
    const path = rawPath.trim().split(".");
    let current: unknown = variables;

    for (const segment of path) {
      if (current === null || current === undefined) {
        return "";
      }

      if (Array.isArray(current)) {
        const index = Number(segment);

        if (Number.isNaN(index)) {
          return "";
        }

        current = current[index];
        continue;
      }

      if (typeof current !== "object") {
        return "";
      }

      current = (current as Record<string, unknown>)[segment];
    }

    if (current === null || current === undefined) {
      return "";
    }

    if (Array.isArray(current)) {
      return current.join(", ");
    }

    return String(current);
  });
}
