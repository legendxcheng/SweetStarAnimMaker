import type { SceneSheetRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { SceneSheetNotFoundError } from "../errors/scene-sheet-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";

export interface ApproveSceneSheetInput {
  projectId: string;
  sceneId: string;
}

export interface ApproveSceneSheetUseCase {
  execute(input: ApproveSceneSheetInput): Promise<SceneSheetRecord>;
}

export interface ApproveSceneSheetUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository: SceneSheetRepository;
  clock: Clock;
}

export function createApproveSceneSheetUseCase(
  dependencies: ApproveSceneSheetUseCaseDependencies,
): ApproveSceneSheetUseCase {
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

      const approvedAt = dependencies.clock.now();
      const approvedScene = {
        ...scene,
        status: "approved" as const,
        approvedAt,
        updatedAt: approvedAt,
      };

      await dependencies.sceneSheetRepository.updateScene(approvedScene);

      const batchScenes = await dependencies.sceneSheetRepository.listScenesByBatchId(approvedScene.batchId);
      const effectiveScenes = batchScenes.map((batchScene) =>
        batchScene.id === approvedScene.id ? approvedScene : batchScene,
      );

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: effectiveScenes.every((batchScene) => batchScene.status === "approved")
          ? "scene_sheets_approved"
          : "scene_sheets_in_review",
        updatedAt: approvedAt,
      });

      return approvedScene;
    },
  };
}
