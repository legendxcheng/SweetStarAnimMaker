import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  masterPlotGenerateQueueName,
  type MasterPlotGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { PremiseStorage } from "../ports/script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateMasterPlotGenerateTaskInput {
  projectId: string;
}

export interface CreateMasterPlotGenerateTaskUseCase {
  execute(input: CreateMasterPlotGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateMasterPlotGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  premiseStorage: PremiseStorage;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateMasterPlotGenerateTaskUseCase(
  dependencies: CreateMasterPlotGenerateTaskUseCaseDependencies,
): CreateMasterPlotGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (project.status !== "premise_ready") {
        throw new ProjectValidationError("Master plot generation requires premise_ready");
      }

      const premiseText = await dependencies.premiseStorage.readPremise({
        storageDir: project.storageDir,
      });

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "master_plot_generate",
        queueName: masterPlotGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: MasterPlotGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "master_plot_generate",
        premiseText,
        promptTemplateKey: "master_plot.generate",
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
          status: "master_plot_generating",
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
