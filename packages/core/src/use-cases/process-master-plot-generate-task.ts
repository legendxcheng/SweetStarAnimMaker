import type { CurrentMasterPlot } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotProvider } from "../ports/storyboard-provider";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessMasterPlotGenerateTaskInput {
  taskId: string;
}

export interface ProcessMasterPlotGenerateTaskUseCase {
  execute(input: ProcessMasterPlotGenerateTaskInput): Promise<void>;
}

export interface ProcessMasterPlotGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  masterPlotProvider: MasterPlotProvider;
  masterPlotStorage: MasterPlotStorage;
  clock: Clock;
}

export function createProcessMasterPlotGenerateTaskUseCase(
  dependencies: ProcessMasterPlotGenerateTaskUseCaseDependencies,
): ProcessMasterPlotGenerateTaskUseCase {
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
        assertMasterPlotTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const promptTemplate = await dependencies.masterPlotStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.promptTemplateKey,
        });
        const promptText = renderPromptTemplate(promptTemplate, taskInput.premiseText);

        await dependencies.masterPlotStorage.writePromptSnapshot({
          taskStorageDir: task.storageDir,
          promptText,
          promptVariables: {
            premiseText: taskInput.premiseText,
          },
        });

        const providerResult = await dependencies.masterPlotProvider.generateMasterPlot({
          projectId: project.id,
          premiseText: taskInput.premiseText,
          promptText,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();
        const masterPlot = normalizeMasterPlot({
          taskId: task.id,
          updatedAt: finishedAt,
          masterPlot: providerResult.masterPlot,
        });

        await dependencies.masterPlotStorage.writeRawResponse({
          taskStorageDir: task.storageDir,
          rawResponse: providerResult.rawResponse,
        });
        await dependencies.masterPlotStorage.writeCurrentMasterPlot({
          storageDir: project.storageDir,
          masterPlot,
        });
        await dependencies.projectRepository.updateCurrentMasterPlot({
          projectId: project.id,
          masterPlotId: masterPlot.id,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "master_plot_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            masterPlotId: masterPlot.id,
            title: masterPlot.title,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "master plot generation succeeded",
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
          message: `master plot generation failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: task.projectId,
          status: "premise_ready",
          updatedAt: finishedAt,
        });

        throw error;
      }
    },
  };
}

function assertMasterPlotTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "master_plot_generate";
  premiseText: string;
  promptTemplateKey: "master_plot.generate";
} {
  if (input.taskType !== "master_plot_generate") {
    throw new Error(`Unsupported task input for master plot processing: ${input.taskType}`);
  }
}

function renderPromptTemplate(template: string, premiseText: string) {
  return template.replaceAll("{{premiseText}}", premiseText);
}

function normalizeMasterPlot(input: {
  taskId: string;
  updatedAt: string;
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
}): CurrentMasterPlot {
  return {
    ...input.masterPlot,
    id: toMasterPlotId(input.taskId),
    sourceTaskId: input.taskId,
    updatedAt: input.updatedAt,
    approvedAt: null,
  };
}

function toMasterPlotId(taskId: string) {
  return taskId.startsWith("task_")
    ? taskId.replace(/^task_/, "master_plot_")
    : `master_plot_${taskId}`;
}
