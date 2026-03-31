import { matchesShotScriptSegmentSelector } from "@sweet-star/shared";

import { mergeShotScriptSegment, toInReviewShotScriptSegment } from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptProvider } from "../ports/shot-script-provider";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessShotScriptSegmentGenerateTaskInput {
  taskId: string;
}

export interface ProcessShotScriptSegmentGenerateTaskUseCase {
  execute(input: ProcessShotScriptSegmentGenerateTaskInput): Promise<void>;
}

export interface ProcessShotScriptSegmentGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotScriptProvider: ShotScriptProvider;
  shotScriptStorage: ShotScriptStorage;
  clock: Clock;
}

const shotScriptRecoveryQueues = new Map<string, Promise<void>>();

export function createProcessShotScriptSegmentGenerateTaskUseCase(
  dependencies: ProcessShotScriptSegmentGenerateTaskUseCaseDependencies,
): ProcessShotScriptSegmentGenerateTaskUseCase {
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
        assertShotScriptSegmentTaskInput(taskInput);

        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
          storageDir: project.storageDir,
        });

        if (!currentShotScript) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const promptTemplate = await dependencies.shotScriptStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.promptTemplateKey,
        });
        const promptVariables = {
          storyboardTitle: taskInput.storyboardTitle,
          episodeTitle: taskInput.episodeTitle,
          scene: taskInput.scene,
          segment: taskInput.segment,
          masterPlot: taskInput.masterPlot,
          characterSheets: taskInput.characterSheets ?? [],
          ...buildSpokenTextBudgetPromptVariables(taskInput.segment.durationSec),
        };
        const promptText = renderTemplate(promptTemplate, promptVariables);

        await dependencies.shotScriptStorage.writePromptSnapshot({
          taskStorageDir: task.storageDir,
          promptText,
          promptVariables,
        });

        if (!dependencies.shotScriptProvider.generateShotScriptSegment) {
          throw new Error("Shot script provider does not support segment shot script generation");
        }

        const providerResult = await dependencies.shotScriptProvider.generateShotScriptSegment({
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

        const recovered = await withSerializedShotScriptRecovery(project.storageDir, async () => {
          if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
            return false;
          }

          const latestShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
            storageDir: project.storageDir,
          });

          if (!latestShotScript) {
            throw new CurrentShotScriptNotFoundError(project.id);
          }

          const existingSegment = latestShotScript.segments.find((segment) =>
            matchesShotScriptSegmentSelector(segment, {
              sceneId: taskInput.sceneId,
              segmentId: taskInput.segmentId,
            }),
          );

          if (!existingSegment) {
            throw new Error(`Shot script segment not found: ${taskInput.segmentId}`);
          }

          const updatedSegment = toInReviewShotScriptSegment({
            baseSegment: existingSegment,
            shots: providerResult.segment.shots,
            updatedAt: finishedAt,
            name: providerResult.segment.name,
            summary: providerResult.segment.summary,
          });
          const updatedShotScript = mergeShotScriptSegment(
            latestShotScript,
            updatedSegment,
            finishedAt,
          );

          await dependencies.shotScriptStorage.writeCurrentShotScript({
            storageDir: project.storageDir,
            shotScript: updatedShotScript,
          });
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: "shot_script_in_review",
            updatedAt: finishedAt,
          });
          await dependencies.taskFileStorage.writeTaskOutput({
            task,
            output: {
              shotScriptId: updatedShotScript.id,
              segmentId: updatedSegment.segmentId,
              shotCount: updatedSegment.shots.length,
            },
          });

          return true;
        });

        if (!recovered) {
          return;
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "shot script segment generation succeeded",
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

        if (hasRawResponse(error)) {
          await dependencies.shotScriptStorage.writeRawResponse({
            taskStorageDir: task.storageDir,
            rawResponse: error.rawResponse,
          });
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `shot script segment generation failed: ${errorMessage}`,
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

async function withSerializedShotScriptRecovery<T>(storageDir: string, action: () => Promise<T>) {
  const previous = shotScriptRecoveryQueues.get(storageDir) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const next = previous.finally(() => current);

  shotScriptRecoveryQueues.set(storageDir, next);
  await previous;

  try {
    return await action();
  } finally {
    releaseCurrent();

    if (shotScriptRecoveryQueues.get(storageDir) === next) {
      shotScriptRecoveryQueues.delete(storageDir);
    }
  }
}

function hasRawResponse(error: unknown): error is { rawResponse: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "rawResponse" in error &&
    typeof (error as { rawResponse?: unknown }).rawResponse === "string"
  );
}

function assertShotScriptSegmentTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "shot_script_segment_generate";
  sourceStoryboardId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  scene: {
    id: string;
    order: number;
    name: string;
    dramaticPurpose: string;
  };
  segment: {
    id: string;
    order: number;
    durationSec: number | null;
    visual: string;
    characterAction: string;
    dialogue: string;
    voiceOver: string;
    audio: string;
    purpose: string;
  };
  storyboardTitle: string | null;
  episodeTitle: string | null;
  masterPlot?: unknown;
  characterSheets?: unknown[];
  promptTemplateKey: "shot_script.segment.generate";
} {
  if (input.taskType !== "shot_script_segment_generate") {
    throw new Error(`Unsupported task input for shot script segment processing: ${input.taskType}`);
  }
}

function buildSpokenTextBudgetPromptVariables(durationSec: number | null) {
  const safeDurationSec = Math.max(0, Math.floor(durationSec ?? 0));
  const segmentMaxSpokenChars = safeDurationSec * 3;

  return {
    segmentMaxSpokenChars,
    spokenTextBudgetRule: `当前 segment 的 dialogue + os 总字数上限 = ${segmentMaxSpokenChars} 字（按 1 秒 3 字计算）。`,
    shotSpokenTextBudgetRule:
      "每个 shot 的 dialogue + os 字数也必须 <= 该 shot.durationSec × 3；如果超出，就压缩文案或拆分更多 shots。",
  };
}

function renderTemplate(template: string, variables: Record<string, unknown>) {
  return template.replaceAll(/\{\{([^}]+)\}\}/g, (_, rawPath: string) => {
    if (rawPath.trim() === "characterSheets") {
      return renderCharacterSheets(variables.characterSheets);
    }

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

function renderCharacterSheets(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return "无已批准角色设定";
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const characterName = readTemplateString(
        (entry as { characterName?: unknown }).characterName,
        "未命名角色",
      );
      const promptTextCurrent = readTemplateString(
        (entry as { promptTextCurrent?: unknown }).promptTextCurrent,
        "未提供当前造型",
      );
      const imageAssetPath = readTemplateString(
        (entry as { imageAssetPath?: unknown }).imageAssetPath,
        "未提供参考图路径",
      );

      return [
        `- 标准角色名：${characterName}`,
        `  当前造型：${promptTextCurrent}`,
        `  参考图路径：${imageAssetPath}`,
      ].join("\n");
    })
    .filter((entry): entry is string => typeof entry === "string")
    .join("\n");
}

function readTemplateString(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value;
}
