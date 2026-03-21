import type { TaskDetail } from "@sweet-star/shared";

import {
  characterSheetsGenerateQueueName,
  createTaskRecord,
  type CharacterSheetsGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateCharacterSheetsGenerateTaskInput {
  projectId: string;
}

export interface CreateCharacterSheetsGenerateTaskUseCase {
  execute(input: CreateCharacterSheetsGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateCharacterSheetsGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateCharacterSheetsGenerateTaskUseCase(
  dependencies: CreateCharacterSheetsGenerateTaskUseCaseDependencies,
): CreateCharacterSheetsGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (project.status !== "master_plot_approved") {
        throw new ProjectValidationError(
          "Character sheets generation requires master_plot_approved",
        );
      }

      const currentMasterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
        storageDir: project.storageDir,
      });

      if (!currentMasterPlot || !currentMasterPlot.approvedAt) {
        throw new CurrentMasterPlotNotFoundError(project.id);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "character_sheets_generate",
        queueName: characterSheetsGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: CharacterSheetsGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "character_sheets_generate",
        sourceMasterPlotId: currentMasterPlot.id,
        mainCharacters: currentMasterPlot.mainCharacters,
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

      try {
        await dependencies.taskQueue.enqueue({
          taskId: task.id,
          queueName: task.queueName,
          taskType: task.type,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "character_sheets_generating",
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
