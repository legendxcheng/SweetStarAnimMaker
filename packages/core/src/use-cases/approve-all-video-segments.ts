import type { VideoListResponse } from "@sweet-star/shared";

import { toCurrentVideoBatchSummary, toPublicSegmentVideoRecord } from "../domain/video";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface ApproveAllVideoSegmentsInput {
  projectId: string;
}

export interface ApproveAllVideoSegmentsUseCase {
  execute(input: ApproveAllVideoSegmentsInput): Promise<VideoListResponse>;
}

export interface ApproveAllVideoSegmentsUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  clock: Clock;
}

function isSegmentVideoReadyForApproval(segment: {
  status: string;
  videoAssetPath: string | null;
}) {
  return segment.status === "in_review" && segment.videoAssetPath !== null;
}

function isSegmentVideoApprovedOrReady(segment: {
  status: string;
  videoAssetPath: string | null;
}) {
  return (
    (segment.status === "approved" && segment.videoAssetPath !== null) ||
    isSegmentVideoReadyForApproval(segment)
  );
}

export function createApproveAllVideoSegmentsUseCase(
  dependencies: ApproveAllVideoSegmentsUseCaseDependencies,
): ApproveAllVideoSegmentsUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentVideoBatchId) {
        throw new CurrentVideoBatchNotFoundError(project.id);
      }

      const batch = await dependencies.videoRepository.findBatchById(project.currentVideoBatchId);

      if (!batch) {
        throw new CurrentVideoBatchNotFoundError(project.id);
      }

      const timestamp = dependencies.clock.now();
      const segments = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);
      const invalidSegment = segments.find((segment) => !isSegmentVideoApprovedOrReady(segment));

      if (invalidSegment) {
        throw new ProjectValidationError("All segment videos must be generated before approval");
      }

      const updatedSegments = segments.map((segment) =>
        segment.status === "approved"
          ? segment
          : {
              ...segment,
              status: "approved" as const,
              approvedAt: segment.approvedAt ?? timestamp,
              updatedAt: timestamp,
            },
      );

      for (const segment of updatedSegments) {
        if (segment.status === "approved" && segments.some((item) => item.id === segment.id && item.status === "approved")) {
          continue;
        }

        await dependencies.videoRepository.updateSegment(segment);
      }

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "videos_approved",
        updatedAt: timestamp,
      });

      return {
        currentBatch: toCurrentVideoBatchSummary(batch, updatedSegments),
        segments: updatedSegments.map(toPublicSegmentVideoRecord),
      };
    },
  };
}
