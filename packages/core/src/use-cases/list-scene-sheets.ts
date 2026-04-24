import type { SceneSheetListResponse } from "@sweet-star/shared";

import { toCurrentSceneSheetBatchSummary } from "../domain/scene-sheet";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentSceneSheetBatchNotFoundError } from "../errors/scene-sheet-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";

export interface ListSceneSheetsInput {
  projectId: string;
}

export interface ListSceneSheetsUseCase {
  execute(input: ListSceneSheetsInput): Promise<SceneSheetListResponse>;
}

export interface ListSceneSheetsUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository: SceneSheetRepository;
}

export function createListSceneSheetsUseCase(
  dependencies: ListSceneSheetsUseCaseDependencies,
): ListSceneSheetsUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentSceneSheetBatchId) {
        throw new CurrentSceneSheetBatchNotFoundError(project.id);
      }

      const batch = await dependencies.sceneSheetRepository.findBatchById(
        project.currentSceneSheetBatchId,
      );

      if (!batch) {
        throw new CurrentSceneSheetBatchNotFoundError(project.id);
      }

      const scenes = await dependencies.sceneSheetRepository.listScenesByBatchId(batch.id);

      return {
        currentBatch: toCurrentSceneSheetBatchSummary(batch, scenes),
        scenes,
      };
    },
  };
}
