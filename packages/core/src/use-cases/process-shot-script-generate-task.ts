import { toCurrentShotScriptSummary } from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptProvider } from "../ports/shot-script-provider";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

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

        const providerResult = await dependencies.shotScriptProvider.generateShotScript({
          promptText,
          variables: promptVariables,
        });
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
        };
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

function assertShotScriptTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
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
  promptTemplateKey: "shot_script.generate";
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
