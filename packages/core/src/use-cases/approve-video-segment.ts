import type { SegmentVideoRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface ApproveVideoSegmentInput {
  projectId: string;
  videoId: string;
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

      const segment = await dependencies.videoRepository.findSegmentById(input.videoId);

      if (!segment || segment.projectId !== project.id || segment.batchId !== project.currentVideoBatchId) {
        throw new SegmentVideoNotFoundError(input.videoId);
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
