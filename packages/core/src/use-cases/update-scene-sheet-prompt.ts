import type { SceneSheetRecord, UpdateSceneSheetPromptRequest } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { SceneSheetNotFoundError } from "../errors/scene-sheet-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";

export interface UpdateSceneSheetPromptInput extends UpdateSceneSheetPromptRequest {
  projectId: string;
  sceneId: string;
}

export interface UpdateSceneSheetPromptUseCase {
  execute(input: UpdateSceneSheetPromptInput): Promise<SceneSheetRecord>;
}

export interface UpdateSceneSheetPromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository: SceneSheetRepository;
  clock: Clock;
}

export function createUpdateSceneSheetPromptUseCase(
  dependencies: UpdateSceneSheetPromptUseCaseDependencies,
): UpdateSceneSheetPromptUseCase {
  return {
    async execute(input) {
      const promptTextCurrent = input.promptTextCurrent.trim();

      if (!promptTextCurrent) {
        throw new ProjectValidationError("Scene sheet prompt is required");
      }

      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const scene = await dependencies.sceneSheetRepository.findSceneById(input.sceneId);

      if (!scene || scene.projectId !== project.id) {
        throw new SceneSheetNotFoundError(input.sceneId);
      }

      const updatedScene = {
        ...scene,
        promptTextCurrent,
        updatedAt: dependencies.clock.now(),
      };

      await dependencies.sceneSheetRepository.updateScene(updatedScene);

      return updatedScene;
    },
  };
}
