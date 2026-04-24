import type { ImageFrameListResponse } from "@sweet-star/shared";

import { toCurrentImageBatch } from "../domain/shot-image";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import { hydrateShotWithPlanningSceneMetadata } from "./frame-planning-scene-metadata";

export interface ListImagesInput {
  projectId: string;
}

export interface ListImagesUseCase {
  execute(input: ListImagesInput): Promise<ImageFrameListResponse>;
}

export interface ListImagesUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository?: SceneSheetRepository;
  shotImageRepository: ShotImageRepository;
  shotImageStorage?: ShotImageStorage;
}

export function createListImagesUseCase(
  dependencies: ListImagesUseCaseDependencies,
): ListImagesUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentImageBatchId) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const batch = await dependencies.shotImageRepository.findBatchById(project.currentImageBatchId);

      if (!batch) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const listSegments = dependencies.shotImageRepository.listSegmentsByBatchId
        ? (batchId: string) => dependencies.shotImageRepository.listSegmentsByBatchId!(batchId)
        : dependencies.shotImageRepository.listShotsByBatchId
          ? (batchId: string) => dependencies.shotImageRepository.listShotsByBatchId!(batchId)
          : null;

      if (!listSegments) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const segments = await listSegments(batch.id);
      const hydratedSegments = await Promise.all(
        segments.map((segment) =>
          hydrateShotWithPlanningSceneMetadata(segment, {
            shotImageStorage: dependencies.shotImageStorage,
            sceneSheetRepository: dependencies.sceneSheetRepository,
          }),
        ),
      );

      return {
        currentBatch: toCurrentImageBatch(batch, segments),
        segments: hydratedSegments,
      };
    },
  };
}
