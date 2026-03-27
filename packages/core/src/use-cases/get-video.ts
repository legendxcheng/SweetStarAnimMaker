import type { ShotVideoRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { repairSegmentVideoPromptsIfMissing } from "./repair-segment-video-prompts";

export interface GetVideoInput {
  projectId: string;
  videoId: string;
}

export interface GetVideoUseCase {
  execute(input: GetVideoInput): Promise<ShotVideoRecord>;
}

export interface GetVideoUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotImageRepository: ShotImageRepository;
  videoStorage: VideoStorage;
  videoPromptProvider: VideoPromptProvider;
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

      return repairSegmentVideoPromptsIfMissing(
        {
          shotScriptStorage: dependencies.shotScriptStorage,
          shotImageRepository: dependencies.shotImageRepository,
          videoStorage: dependencies.videoStorage,
          videoPromptProvider: dependencies.videoPromptProvider,
          videoRepository: dependencies.videoRepository,
        },
        project,
        segment,
      );
    },
  };
}
