import type { ImageFrameListResponse } from "@sweet-star/shared";

import { toCurrentImageBatch } from "../domain/shot-image";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface ListImagesInput {
  projectId: string;
}

export interface ListImagesUseCase {
  execute(input: ListImagesInput): Promise<ImageFrameListResponse>;
}

export interface ListImagesUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
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

      const frames = await dependencies.shotImageRepository.listFramesByBatchId(batch.id);

      return {
        currentBatch: toCurrentImageBatch(batch, frames),
        frames,
      };
    },
  };
}
