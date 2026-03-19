import type { CurrentMasterPlot } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotProvider } from "../ports/storyboard-provider";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

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
  masterPlotProvider: MasterPlotProvider;
  masterPlotStorage: MasterPlotStorage;
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
        const finishedAt = dependencies.clock.now();

        await dependencies.masterPlotStorage.writeRawResponse({
          taskStorageDir: task.storageDir,
          rawResponse: providerResult.rawResponse,
        });

        const masterPlot = createCurrentMasterPlot({
          projectId: project.id,
          taskId: task.id,
          updatedAt: finishedAt,
          masterPlot: providerResult.masterPlot,
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
            provider: providerResult.provider,
            model: providerResult.model,
            promptTemplateKey: taskInput.promptTemplateKey,
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

function renderPromptTemplate(template: string, premiseText: string) {
  return template.replaceAll("{{premiseText}}", premiseText);
}

function createCurrentMasterPlot(input: {
  projectId: string;
  taskId: string;
  updatedAt: string;
  masterPlot: Omit<CurrentMasterPlot, "id" | "sourceTaskId" | "updatedAt" | "approvedAt">;
}): CurrentMasterPlot {
  return {
    id: toMasterPlotId(input.projectId),
    ...input.masterPlot,
    sourceTaskId: input.taskId,
    updatedAt: input.updatedAt,
    approvedAt: null,
  };
}

function toMasterPlotId(projectId: string) {
  return `mp_${projectId.replace(/^proj_/, "")}`;
}
