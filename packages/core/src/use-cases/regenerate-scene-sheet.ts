import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  sceneSheetGenerateQueueName,
  type SceneSheetGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { SceneSheetNotFoundError } from "../errors/scene-sheet-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface RegenerateSceneSheetInput {
  projectId: string;
  sceneId: string;
}

export interface RegenerateSceneSheetUseCase {
  execute(input: RegenerateSceneSheetInput): Promise<TaskDetail>;
}

export interface RegenerateSceneSheetUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository: SceneSheetRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateSceneSheetUseCase(
  dependencies: RegenerateSceneSheetUseCaseDependencies,
): RegenerateSceneSheetUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const scene = await dependencies.sceneSheetRepository.findSceneById(input.sceneId);

      if (!scene || scene.projectId !== project.id) {
        throw new SceneSheetNotFoundError(input.sceneId);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "scene_sheet_generate",
        queueName: sceneSheetGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: SceneSheetGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "scene_sheet_generate",
        batchId: scene.batchId,
        sceneId: scene.id,
        sourceMasterPlotId: scene.sourceMasterPlotId,
        sourceCharacterSheetBatchId: scene.sourceCharacterSheetBatchId,
        sceneName: scene.sceneName,
        scenePurpose: scene.scenePurpose,
        promptTextCurrent: scene.promptTextCurrent,
        constraintsText: scene.constraintsText,
        imagePromptTemplateKey: "scene_sheet.generate",
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

      await dependencies.sceneSheetRepository.updateScene({
        ...scene,
        status: "generating",
        approvedAt: null,
        updatedAt: timestamp,
        sourceTaskId: task.id,
      });

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
