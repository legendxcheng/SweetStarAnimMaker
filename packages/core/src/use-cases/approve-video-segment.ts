import type { SegmentVideoRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface ApproveVideoSegmentInput {
  projectId: string;
  segmentId: string;
}

export interface ApproveVideoSegmentUseCase {
  execute(input: ApproveVideoSegmentInput): Promise<SegmentVideoRecord>;
}

export interface ApproveVideoSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  clock: Clock;
}

export function createApproveVideoSegmentUseCase(
  dependencies: ApproveVideoSegmentUseCaseDependencies,
): ApproveVideoSegmentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const segment = await dependencies.videoRepository.findCurrentSegmentByProjectIdAndSegmentId(
        project.id,
        input.segmentId,
      );

      if (!segment) {
        throw new SegmentVideoNotFoundError(input.segmentId);
      }

      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...segment,
        status: "approved" as const,
        approvedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);

      const segments = await dependencies.videoRepository.listSegmentsByBatchId(updatedSegment.batchId);
      const nextSegments = segments.map((item) =>
        item.id === updatedSegment.id ? updatedSegment : item,
      );

      if (nextSegments.every((item) => item.status === "approved")) {
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "videos_approved",
          updatedAt: timestamp,
        });
      }

      return updatedSegment;
    },
  };
}
