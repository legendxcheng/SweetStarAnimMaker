import { ProjectNotFoundError } from "../errors/project-errors";
import { SceneSheetNotFoundError } from "../errors/scene-sheet-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { SceneSheetStorage } from "../ports/scene-sheet-storage";
import type { ShotImageProvider } from "../ports/shot-image-provider";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessSceneSheetGenerateTaskInput {
  taskId: string;
}

export interface ProcessSceneSheetGenerateTaskUseCase {
  execute(input: ProcessSceneSheetGenerateTaskInput): Promise<void>;
}

export interface ProcessSceneSheetGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  sceneSheetRepository: SceneSheetRepository;
  sceneSheetStorage: SceneSheetStorage;
  shotImageProvider: ShotImageProvider;
  clock: Clock;
}

export function createProcessSceneSheetGenerateTaskUseCase(
  dependencies: ProcessSceneSheetGenerateTaskUseCaseDependencies,
): ProcessSceneSheetGenerateTaskUseCase {
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

      let projectId = task.projectId;
      let batchId: string | null = null;
      let currentScene: Awaited<ReturnType<SceneSheetRepository["findSceneById"]>> = null;

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertSceneSheetTaskInput(taskInput);
        projectId = taskInput.projectId;
        batchId = taskInput.batchId;

        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        currentScene = await dependencies.sceneSheetRepository.findSceneById(taskInput.sceneId);

        if (!currentScene || currentScene.projectId !== project.id) {
          throw new SceneSheetNotFoundError(taskInput.sceneId);
        }

        const imagePromptTemplate = await dependencies.sceneSheetStorage.readPromptTemplate?.({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.imagePromptTemplateKey,
        });
        const promptText = renderSceneImagePrompt(imagePromptTemplate, taskInput);
        const providerResult = await dependencies.shotImageProvider.generateShotImage({
          projectId: project.id,
          frameId: taskInput.sceneId,
          promptText,
          negativePromptText: null,
          referenceImagePaths: [],
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.sceneSheetStorage.writeImageVersion({
          scene: currentScene,
          versionTag: `v-${finishedAt.replace(/[^0-9]/g, "")}`,
          imageBytes: providerResult.imageBytes,
          metadata: {
            width: providerResult.width,
            height: providerResult.height,
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
          },
        });
        await dependencies.sceneSheetStorage.writeCurrentImage({
          scene: currentScene,
          imageBytes: providerResult.imageBytes,
          metadata: {
            width: providerResult.width,
            height: providerResult.height,
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
          },
        });

        const updatedScene = {
          ...currentScene,
          imageAssetPath: currentScene.currentImageRelPath,
          imageWidth: providerResult.width,
          imageHeight: providerResult.height,
          provider: providerResult.provider,
          model: providerResult.model,
          status: "in_review" as const,
          approvedAt: null,
          updatedAt: finishedAt,
          sourceTaskId: task.id,
        };

        await dependencies.sceneSheetRepository.updateScene(updatedScene);
        const batchScenes = await dependencies.sceneSheetRepository.listScenesByBatchId(taskInput.batchId);
        const effectiveScenes = batchScenes.map((scene) =>
          scene.id === updatedScene.id ? updatedScene : scene,
        );

        if (effectiveScenes.every((scene) => scene.status !== "generating")) {
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: "scene_sheets_in_review",
            updatedAt: finishedAt,
          });
        }

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            sceneId: updatedScene.id,
            width: providerResult.width,
            height: providerResult.height,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "scene sheet generation succeeded",
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

        if (currentScene) {
          const failedScene = {
            ...currentScene,
            status: "failed" as const,
            approvedAt: null,
            updatedAt: finishedAt,
            sourceTaskId: task.id,
          };

          await dependencies.sceneSheetRepository.updateScene(failedScene);

          if (batchId) {
            const batchScenes = await dependencies.sceneSheetRepository.listScenesByBatchId(batchId);
            const effectiveScenes = batchScenes.map((scene) =>
              scene.id === failedScene.id ? failedScene : scene,
            );

            if (effectiveScenes.every((scene) => scene.status !== "generating")) {
              await dependencies.projectRepository.updateStatus({
                projectId,
                status: "scene_sheets_in_review",
                updatedAt: finishedAt,
              });
            }
          }
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `scene sheet generation failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        throw error;
      }
    },
  };
}

function assertSceneSheetTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "scene_sheet_generate";
  batchId: string;
  sceneId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextCurrent: string;
  constraintsText: string;
  imagePromptTemplateKey: "scene_sheet.generate";
} {
  if (input.taskType !== "scene_sheet_generate") {
    throw new Error(`Unsupported task input for scene sheet processing: ${input.taskType}`);
  }
}

function renderSceneImagePrompt(
  template: string | undefined,
  input: {
    sceneName: string;
    promptTextCurrent: string;
    constraintsText: string;
  },
) {
  if (template && template.trim().length > 0) {
    return template
      .replaceAll("{{sceneName}}", input.sceneName)
      .replaceAll("{{promptTextCurrent}}", input.promptTextCurrent)
      .replaceAll("{{constraintsText}}", input.constraintsText);
  }

  return input.promptTextCurrent;
}
