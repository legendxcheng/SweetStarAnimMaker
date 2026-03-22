import type { TaskDetail } from "@sweet-star/shared";

import {
  characterSheetGenerateQueueName,
  createTaskRecord,
  type CharacterSheetGenerateTaskInput,
} from "../domain/task";
import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface RegenerateCharacterSheetInput {
  projectId: string;
  characterId: string;
}

export interface RegenerateCharacterSheetUseCase {
  execute(input: RegenerateCharacterSheetInput): Promise<TaskDetail>;
}

export interface RegenerateCharacterSheetUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateCharacterSheetUseCase(
  dependencies: RegenerateCharacterSheetUseCaseDependencies,
): RegenerateCharacterSheetUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const character = await dependencies.characterSheetRepository.findCharacterById(
        input.characterId,
      );

      if (!character || character.projectId !== project.id) {
        throw new CharacterSheetNotFoundError(input.characterId);
      }

      const referenceImagePaths = await dependencies.characterSheetStorage.resolveReferenceImagePaths(
        { character },
      );

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "character_sheet_generate",
        queueName: characterSheetGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: CharacterSheetGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "character_sheet_generate",
        batchId: character.batchId,
        characterId: character.id,
        sourceMasterPlotId: character.sourceMasterPlotId,
        characterName: character.characterName,
        promptTextCurrent: character.promptTextCurrent,
        imagePromptTemplateKey: "character_sheet.turnaround.generate",
        referenceImagePaths,
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

      const generatingCharacter = {
        ...character,
        status: "generating" as const,
        approvedAt: null,
        updatedAt: timestamp,
        sourceTaskId: task.id,
      };

      await dependencies.characterSheetRepository.updateCharacter(generatingCharacter);

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
