import type { ImageFrameListResponse } from "@sweet-star/shared";

import { toCurrentImageBatch } from "../domain/shot-image";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import { hydrateShotWithPlanningSceneMetadata } from "./frame-planning-scene-metadata";
import {
  approveShot,
  deriveProjectImageStatusFromShots,
  isShotReadyForApproval,
} from "./shot-reference-frame-helpers";

export interface ApproveAllImageFramesInput {
  projectId: string;
}

export interface ApproveAllImageFramesUseCase {
  execute(input: ApproveAllImageFramesInput): Promise<ImageFrameListResponse>;
}

export interface ApproveAllImageFramesUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository?: SceneSheetRepository;
  shotImageRepository: ShotImageRepository;
  shotImageStorage?: ShotImageStorage;
  clock: Clock;
}

export function createApproveAllImageFramesUseCase(
  dependencies: ApproveAllImageFramesUseCaseDependencies,
): ApproveAllImageFramesUseCase {
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
      const updateSegment = dependencies.shotImageRepository.updateSegment
        ? (segment: Parameters<NonNullable<ShotImageRepository["updateSegment"]>>[0]) =>
            dependencies.shotImageRepository.updateSegment!(segment)
        : dependencies.shotImageRepository.updateShot
          ? (segment: Parameters<NonNullable<ShotImageRepository["updateShot"]>>[0]) =>
              dependencies.shotImageRepository.updateShot!(segment)
          : null;

      if (!listSegments || !updateSegment) {
        throw new CurrentImageBatchNotFoundError(project.id);
      }

      const approvedAt = dependencies.clock.now();
      const segments = await listSegments(batch.id);
      const updatedSegments = segments.map((segment) =>
        isShotReadyForApproval(segment) ? approveShot(segment, approvedAt) : segment,
      );

      for (const segment of updatedSegments) {
        await updateSegment(segment);
      }

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: deriveProjectImageStatusFromShots(updatedSegments),
        updatedAt: approvedAt,
      });

      const hydratedSegments = await Promise.all(
        updatedSegments.map((segment) =>
          hydrateShotWithPlanningSceneMetadata(segment, {
            shotImageStorage: dependencies.shotImageStorage,
            sceneSheetRepository: dependencies.sceneSheetRepository,
          }),
        ),
      );

      return {
        currentBatch: toCurrentImageBatch(batch, updatedSegments),
        segments: hydratedSegments,
      };
    },
  };
}
