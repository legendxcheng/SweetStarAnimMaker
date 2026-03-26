import type { VideoListResponse } from "@sweet-star/shared";

import { toCurrentVideoBatchSummary } from "../domain/video";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { repairSegmentVideoPromptsIfMissing } from "./repair-segment-video-prompts";

export interface ListVideosInput {
  projectId: string;
}

export interface ListVideosUseCase {
  execute(input: ListVideosInput): Promise<VideoListResponse>;
}

export interface ListVideosUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  videoStorage: VideoStorage;
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
      const repairedSegments = await Promise.all(
        segments.map((segment) =>
          repairSegmentVideoPromptsIfMissing(
            {
              shotScriptStorage: dependencies.shotScriptStorage,
              videoStorage: dependencies.videoStorage,
              videoRepository: dependencies.videoRepository,
            },
            project,
            segment,
          ),
        ),
      );

      return {
        currentBatch: toCurrentVideoBatchSummary(batch, repairedSegments),
        shots: repairedSegments.map(toVisibleSegmentVideoRecord),
      };
    },
  };
}

function toVisibleSegmentVideoRecord<T extends {
  status: string;
  sourceTaskId: string | null;
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
}>(segment: T): T {
  if (segment.status === "generating" && segment.sourceTaskId === null) {
    return {
      ...segment,
      videoAssetPath: null,
      thumbnailAssetPath: null,
    };
  }

  return segment;
}
