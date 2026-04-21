import type { CurrentStoryboard } from "@sweet-star/shared";

import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardProvider } from "../ports/storyboard-provider";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessStoryboardGenerateTaskInput {
  taskId: string;
}

export interface ProcessStoryboardGenerateTaskUseCase {
  execute(input: ProcessStoryboardGenerateTaskInput): Promise<void>;
}

export interface ProcessStoryboardGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  storyboardProvider: StoryboardProvider;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
  clock: Clock;
}

export function createProcessStoryboardGenerateTaskUseCase(
  dependencies: ProcessStoryboardGenerateTaskUseCaseDependencies,
): ProcessStoryboardGenerateTaskUseCase {
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
        assertStoryboardTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const promptTemplate = await dependencies.masterPlotStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.promptTemplateKey,
        });
        const promptText = renderPromptTemplate(promptTemplate, taskInput.masterPlot);

        await dependencies.masterPlotStorage.writePromptSnapshot({
          taskStorageDir: task.storageDir,
          promptText,
          promptVariables: {
            masterPlot: taskInput.masterPlot,
          },
        });

        const providerResult = await dependencies.storyboardProvider.generateStoryboard({
          projectId: project.id,
          masterPlot: taskInput.masterPlot,
          promptText,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.masterPlotStorage.writeRawResponse({
          taskStorageDir: task.storageDir,
          rawResponse: providerResult.rawResponse,
        });

        const storyboard = normalizeStoryboard({
          storyboard: providerResult.storyboard,
          sourceMasterPlotId: taskInput.sourceMasterPlotId,
          taskId: task.id,
          updatedAt: finishedAt,
        });
        const summary = toCurrentStoryboardSummary(storyboard);

        await dependencies.storyboardStorage.writeCurrentStoryboard({
          storageDir: project.storageDir,
          storyboard,
        });
        await dependencies.projectRepository.updateCurrentStoryboard({
          projectId: project.id,
          storyboardId: storyboard.id,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "storyboard_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            storyboardId: storyboard.id,
            sceneCount: summary.sceneCount,
            segmentCount: summary.segmentCount,
            totalDurationSec: summary.totalDurationSec,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "storyboard generation succeeded",
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
          message: `storyboard generation failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        await restoreProjectAfterStoryboardFailure({
          dependencies,
          projectId: task.projectId,
          updatedAt: finishedAt,
        });

        throw error;
      }
    },
  };
}

async function restoreProjectAfterStoryboardFailure(input: {
  dependencies: ProcessStoryboardGenerateTaskUseCaseDependencies;
  projectId: string;
  updatedAt: string;
}) {
  const project = await input.dependencies.projectRepository.findById(input.projectId);

  if (project) {
    const currentStoryboard =
      await input.dependencies.storyboardStorage.readCurrentStoryboard({
        storageDir: project.storageDir,
      });

    if (currentStoryboard) {
      await input.dependencies.projectRepository.updateCurrentStoryboard({
        projectId: input.projectId,
        storyboardId: currentStoryboard.id,
      });
      await input.dependencies.projectRepository.updateStatus({
        projectId: input.projectId,
        status: currentStoryboard.approvedAt ? "storyboard_approved" : "storyboard_in_review",
        updatedAt: input.updatedAt,
      });
      return;
    }
  }

  await input.dependencies.projectRepository.updateStatus({
    projectId: input.projectId,
    status: "character_sheets_approved",
    updatedAt: input.updatedAt,
  });
}

function assertStoryboardTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "storyboard_generate";
  sourceMasterPlotId: string;
  masterPlot: {
    title: string | null;
    logline: string;
    synopsis: string;
    mainCharacters: string[];
    coreConflict: string;
    emotionalArc: string;
    endingBeat: string;
    targetDurationSec: number | null;
  };
  promptTemplateKey: "storyboard.generate";
  model: "gemini-3.1-pro-preview";
} {
  if (input.taskType !== "storyboard_generate") {
    throw new Error(`Unsupported task input for storyboard processing: ${input.taskType}`);
  }
}

function renderPromptTemplate(
  template: string,
  masterPlot: {
    title: string | null;
    logline: string;
    synopsis: string;
    mainCharacters: string[];
    coreConflict: string;
    emotionalArc: string;
    endingBeat: string;
    targetDurationSec: number | null;
  },
) {
  return template
    .replaceAll("{{masterPlot.title}}", masterPlot.title ?? "")
    .replaceAll("{{masterPlot.logline}}", masterPlot.logline)
    .replaceAll("{{masterPlot.synopsis}}", masterPlot.synopsis)
    .replaceAll("{{masterPlot.mainCharacters}}", masterPlot.mainCharacters.join(", "))
    .replaceAll("{{masterPlot.coreConflict}}", masterPlot.coreConflict)
    .replaceAll("{{masterPlot.emotionalArc}}", masterPlot.emotionalArc)
    .replaceAll("{{masterPlot.endingBeat}}", masterPlot.endingBeat)
    .replaceAll(
      "{{masterPlot.targetDurationSec}}",
      masterPlot.targetDurationSec === null ? "" : String(masterPlot.targetDurationSec),
    );
}

function normalizeStoryboard(input: {
  storyboard: CurrentStoryboard;
  sourceMasterPlotId: string;
  taskId: string;
  updatedAt: string;
}): CurrentStoryboard {
  return {
    ...input.storyboard,
    sourceMasterPlotId: input.sourceMasterPlotId,
    sourceTaskId: input.taskId,
    updatedAt: input.updatedAt,
    approvedAt: null,
  };
}
