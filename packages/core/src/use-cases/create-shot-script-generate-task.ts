import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  shotScriptGenerateQueueName,
  type ShotScriptGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateShotScriptGenerateTaskInput {
  projectId: string;
}

export interface CreateShotScriptGenerateTaskUseCase {
  execute(input: CreateShotScriptGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateShotScriptGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  masterPlotStorage: MasterPlotStorage;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateShotScriptGenerateTaskUseCase(
  dependencies: CreateShotScriptGenerateTaskUseCaseDependencies,
): CreateShotScriptGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (
        project.status !== "storyboard_approved" &&
        project.status !== "shot_script_in_review" &&
        project.status !== "shot_script_approved"
      ) {
        throw new ProjectValidationError(
          "Shot script generation requires an approved storyboard",
        );
      }

      const currentStoryboard = await dependencies.storyboardStorage.readCurrentStoryboard({
        storageDir: project.storageDir,
      });

      if (!currentStoryboard || !currentStoryboard.approvedAt) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      const currentMasterPlot = project.currentMasterPlotId
        ? await dependencies.masterPlotStorage.readCurrentMasterPlot({
            storageDir: project.storageDir,
          })
        : null;

      const characterSheets = project.currentCharacterSheetBatchId
        ? await dependencies.characterSheetRepository.listCharactersByBatchId(
            project.currentCharacterSheetBatchId,
          )
        : [];
      const characterSheetSnapshots = characterSheets.map((character) => ({
        characterId: character.id,
        characterName: character.characterName,
        promptTextCurrent: character.promptTextCurrent,
        imageAssetPath: character.imageAssetPath,
      }));

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "shot_script_generate",
        queueName: shotScriptGenerateQueueName,
        createdAt: timestamp,
      });

      const taskInput: ShotScriptGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "shot_script_generate",
        sourceStoryboardId: currentStoryboard.id,
        storyboard: {
          id: currentStoryboard.id,
          title: currentStoryboard.title,
          episodeTitle: currentStoryboard.episodeTitle,
          scenes: currentStoryboard.scenes,
        },
        sourceMasterPlotId: currentMasterPlot?.id,
        masterPlot: currentMasterPlot
          ? {
              id: currentMasterPlot.id,
              title: currentMasterPlot.title,
              logline: currentMasterPlot.logline,
              synopsis: currentMasterPlot.synopsis,
              mainCharacters: currentMasterPlot.mainCharacters,
              coreConflict: currentMasterPlot.coreConflict,
              emotionalArc: currentMasterPlot.emotionalArc,
              endingBeat: currentMasterPlot.endingBeat,
              targetDurationSec: currentMasterPlot.targetDurationSec,
            }
          : undefined,
        sourceCharacterSheetBatchId: project.currentCharacterSheetBatchId ?? undefined,
        characterSheets:
          characterSheetSnapshots.length > 0 ? characterSheetSnapshots : undefined,
        promptTemplateKey: "shot_script.segment.generate",
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
          status: "shot_script_generating",
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
