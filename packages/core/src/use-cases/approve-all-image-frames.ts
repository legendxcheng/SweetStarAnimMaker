import type { ImageFrameListResponse } from "@sweet-star/shared";

import { toCurrentImageBatch } from "../domain/shot-image";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface ApproveAllImageFramesInput {
  projectId: string;
}

export interface ApproveAllImageFramesUseCase {
  execute(input: ApproveAllImageFramesInput): Promise<ImageFrameListResponse>;
}

export interface ApproveAllImageFramesUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
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

      const approvedAt = dependencies.clock.now();
      const frames = await dependencies.shotImageRepository.listFramesByBatchId(batch.id);
      const updatedFrames = frames.map((frame) => ({
        ...frame,
        imageStatus: "approved" as const,
        approvedAt: frame.approvedAt ?? approvedAt,
        updatedAt: approvedAt,
      }));

      for (const frame of updatedFrames) {
        await dependencies.shotImageRepository.updateFrame(frame);
      }

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "images_approved",
        updatedAt: approvedAt,
      });

      return {
        currentBatch: toCurrentImageBatch(batch, updatedFrames),
        frames: updatedFrames,
      };
    },
  };
}
