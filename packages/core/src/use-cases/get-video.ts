import type { SegmentVideoRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface GetVideoInput {
  projectId: string;
  videoId: string;
}

export interface GetVideoUseCase {
  execute(input: GetVideoInput): Promise<SegmentVideoRecord>;
}

export interface GetVideoUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
}

export function createGetVideoUseCase(
  dependencies: GetVideoUseCaseDependencies,
): GetVideoUseCase {
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

      return segment;
    },
  };
}
