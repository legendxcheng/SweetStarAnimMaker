import type { TaskDetail } from "@sweet-star/shared";

import {
  sceneSheetsGenerateQueueName,
  createTaskRecord,
  type SceneSheetsGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateSceneSheetsGenerateTaskInput {
  projectId: string;
}

export interface CreateSceneSheetsGenerateTaskUseCase {
  execute(input: CreateSceneSheetsGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateSceneSheetsGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  characterSheetRepository: CharacterSheetRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateSceneSheetsGenerateTaskUseCase(
  dependencies: CreateSceneSheetsGenerateTaskUseCaseDependencies,
): CreateSceneSheetsGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentCharacterSheetBatchId) {
        throw new ProjectValidationError(
          "Scene sheets generation requires an approved current character sheet batch",
        );
      }

      const currentCharacterSheetBatch = await dependencies.characterSheetRepository.findBatchById(
        project.currentCharacterSheetBatchId,
      );

      if (!currentCharacterSheetBatch) {
        throw new ProjectValidationError(
          "Scene sheets generation requires an approved current character sheet batch",
        );
      }

      const currentCharacters =
        await dependencies.characterSheetRepository.listCharactersByBatchId(currentCharacterSheetBatch.id);
      const approvedCharacterCount = currentCharacters.filter(
        (character) => character.approvedAt != null || character.status === "approved",
      ).length;

      if (
        currentCharacterSheetBatch.characterCount <= 0 ||
        approvedCharacterCount !== currentCharacterSheetBatch.characterCount
      ) {
        throw new ProjectValidationError(
          "Scene sheets generation requires character_sheets_approved",
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
        type: "scene_sheets_generate",
        queueName: sceneSheetsGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: SceneSheetsGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "scene_sheets_generate",
        batchId: toSceneSheetBatchId(task.id),
        sourceMasterPlotId: currentMasterPlot.id,
        sourceCharacterSheetBatchId: currentCharacterSheetBatch.id,
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
          status: "scene_sheets_generating",
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

function toSceneSheetBatchId(taskId: string) {
  return `scene_batch_${taskId}`;
}
