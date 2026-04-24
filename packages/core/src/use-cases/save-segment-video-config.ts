import type {
  SaveSegmentVideoConfigRequest,
  SegmentVideoRecord,
} from "@sweet-star/shared";

import { toPublicSegmentVideoRecord } from "../domain/video";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";
import { deriveProjectVideoStatus } from "./derive-project-video-status";

export interface SaveSegmentVideoConfigInput extends SaveSegmentVideoConfigRequest {
  projectId: string;
  videoId: string;
}

export interface SaveSegmentVideoConfigUseCase {
  execute(input: SaveSegmentVideoConfigInput): Promise<SegmentVideoRecord>;
}

export interface SaveSegmentVideoConfigUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  clock: Clock;
}

export function createSaveSegmentVideoConfigUseCase(
  dependencies: SaveSegmentVideoConfigUseCaseDependencies,
): SaveSegmentVideoConfigUseCase {
  return {
    async execute(input) {
      const promptTextCurrent = input.promptTextCurrent.trim();

      if (!promptTextCurrent) {
        throw new ProjectValidationError("Video prompt is required");
      }

      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const segment = await dependencies.videoRepository.findSegmentById(input.videoId);

      if (
        !segment ||
        segment.projectId !== project.id ||
        segment.batchId !== project.currentVideoBatchId
      ) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...segment,
        status: segment.status === "approved" ? ("in_review" as const) : segment.status,
        approvedAt: segment.status === "approved" ? null : segment.approvedAt,
        promptTextCurrent,
        referenceImages: input.referenceImages,
        referenceAudios: input.referenceAudios,
        promptUpdatedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);
      const segments = await dependencies.videoRepository.listSegmentsByBatchId(segment.batchId);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: deriveProjectVideoStatus(segments, updatedSegment),
        updatedAt: timestamp,
      });

      return toPublicSegmentVideoRecord(updatedSegment);
    },
  };
}
