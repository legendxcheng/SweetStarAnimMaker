import type { SegmentFrameRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface ApproveImageFrameInput {
  projectId: string;
  frameId: string;
}

export interface ApproveImageFrameUseCase {
  execute(input: ApproveImageFrameInput): Promise<SegmentFrameRecord>;
}

export interface ApproveImageFrameUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  clock: Clock;
}

export function createApproveImageFrameUseCase(
  dependencies: ApproveImageFrameUseCaseDependencies,
): ApproveImageFrameUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const frame = await dependencies.shotImageRepository.findFrameById(input.frameId);

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      const timestamp = dependencies.clock.now();
      const updatedFrame = {
        ...frame,
        imageStatus: "approved" as const,
        approvedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.shotImageRepository.updateFrame(updatedFrame);

      const frames = await dependencies.shotImageRepository.listFramesByBatchId(updatedFrame.batchId);

      if (frames.every((item) => item.imageStatus === "approved")) {
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "images_approved",
          updatedAt: timestamp,
        });
      }

      return updatedFrame;
    },
  };
}
