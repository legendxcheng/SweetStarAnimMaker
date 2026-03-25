import type { VideoListResponse } from "@sweet-star/shared";

import { toCurrentVideoBatchSummary } from "../domain/video";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface ListVideosInput {
  projectId: string;
}

export interface ListVideosUseCase {
  execute(input: ListVideosInput): Promise<VideoListResponse>;
}

export interface ListVideosUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
}

export function createListVideosUseCase(
  dependencies: ListVideosUseCaseDependencies,
): ListVideosUseCase {
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

      const segments = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);

      return {
        currentBatch: toCurrentVideoBatchSummary(batch, segments),
        segments,
      };
    },
  };
}
