import type { SegmentVideoRecord, SaveVideoPromptRequest } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface UpdateVideoPromptInput extends SaveVideoPromptRequest {
  projectId: string;
  videoId: string;
}

export interface UpdateVideoPromptUseCase {
  execute(input: UpdateVideoPromptInput): Promise<SegmentVideoRecord>;
}

export interface UpdateVideoPromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  clock: Clock;
}

export function createUpdateVideoPromptUseCase(
  dependencies: UpdateVideoPromptUseCaseDependencies,
): UpdateVideoPromptUseCase {
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

      if (!segment || segment.projectId !== project.id) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...segment,
        promptTextCurrent,
        promptUpdatedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);

      return updatedSegment;
    },
  };
}
