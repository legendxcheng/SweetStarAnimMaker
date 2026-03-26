import type { SegmentVideoRecord } from "@sweet-star/shared";

import { buildSegmentVideoPrompt } from "./build-segment-video-prompt";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";

export interface RegenerateVideoPromptInput {
  projectId: string;
  videoId: string;
}

export interface RegenerateVideoPromptUseCase {
  execute(input: RegenerateVideoPromptInput): Promise<SegmentVideoRecord>;
}

export interface RegenerateVideoPromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  clock: Clock;
}

export function createRegenerateVideoPromptUseCase(
  dependencies: RegenerateVideoPromptUseCaseDependencies,
): RegenerateVideoPromptUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentSegment = await dependencies.videoRepository.findSegmentById(input.videoId);

      if (!currentSegment || currentSegment.projectId !== project.id) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!shotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const segment = shotScript.segments.find(
        (item) =>
          item.segmentId === currentSegment.segmentId && item.sceneId === currentSegment.sceneId,
      );

      if (!segment) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const promptTemplate = await dependencies.videoStorage.readPromptTemplate({
        storageDir: project.storageDir,
        promptTemplateKey: "segment_video.generate",
      });
      const promptTextCurrent = buildSegmentVideoPrompt(promptTemplate, {
        segmentSummary: segment.summary,
        shotsSummary: segment.shots.map((shot) => `${shot.shotCode}: ${shot.action}`).join("; "),
      });
      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...currentSegment,
        promptTextCurrent,
        promptUpdatedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);

      return updatedSegment;
    },
  };
}
