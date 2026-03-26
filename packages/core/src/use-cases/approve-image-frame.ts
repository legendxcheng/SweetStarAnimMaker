import type { SegmentFrameRecord, ShotReferenceFrame } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import {
  approveShot,
  deriveProjectImageStatusFromShots,
  isShotReadyForApproval,
  replaceShotInCollection,
  resolveShotFrameRecord,
} from "./shot-reference-frame-helpers";

export interface ApproveImageFrameInput {
  projectId: string;
  frameId: string;
}

export interface ApproveImageFrameUseCase {
  execute(input: ApproveImageFrameInput): Promise<SegmentFrameRecord | ShotReferenceFrame>;
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

      const resolvedShotFrame = project.currentImageBatchId
        ? await resolveShotFrameRecord({
            repository: dependencies.shotImageRepository,
            batchId: project.currentImageBatchId,
            frameId: input.frameId,
          })
        : null;
      const frame =
        resolvedShotFrame?.frame ??
        (await dependencies.shotImageRepository.findFrameById(input.frameId));

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      const timestamp = dependencies.clock.now();

      if (resolvedShotFrame?.shot && dependencies.shotImageRepository.updateShot) {
        if (!isShotReadyForApproval(resolvedShotFrame.shot)) {
          throw new ProjectValidationError("Shot reference is not ready for approval");
        }

        const approvedShot = approveShot(resolvedShotFrame.shot, timestamp);
        await dependencies.shotImageRepository.updateShot(approvedShot);

        const allShots = dependencies.shotImageRepository.listShotsByBatchId
          ? await dependencies.shotImageRepository.listShotsByBatchId(approvedShot.batchId)
          : [approvedShot];
        const nextShots = replaceShotInCollection(allShots, approvedShot);

        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: deriveProjectImageStatusFromShots(nextShots),
          updatedAt: timestamp,
        });

        return approvedShot.startFrame.id === input.frameId
          ? approvedShot.startFrame
          : approvedShot.endFrame ?? approvedShot.startFrame;
      }

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
