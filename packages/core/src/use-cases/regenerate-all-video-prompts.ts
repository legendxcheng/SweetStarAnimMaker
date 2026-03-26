import type { VideoListResponse } from "@sweet-star/shared";

import { buildSegmentVideoPrompt } from "./build-segment-video-prompt";
import { toCurrentVideoBatchSummary } from "../domain/video";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";

export interface RegenerateAllVideoPromptsInput {
  projectId: string;
}

export interface RegenerateAllVideoPromptsUseCase {
  execute(input: RegenerateAllVideoPromptsInput): Promise<VideoListResponse>;
}

export interface RegenerateAllVideoPromptsUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  clock: Clock;
}

export function createRegenerateAllVideoPromptsUseCase(
  dependencies: RegenerateAllVideoPromptsUseCaseDependencies,
): RegenerateAllVideoPromptsUseCase {
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

      const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!shotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const promptTemplate = await dependencies.videoStorage.readPromptTemplate({
        storageDir: project.storageDir,
        promptTemplateKey: "segment_video.generate",
      });
      const timestamp = dependencies.clock.now();
      const shots = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);
      const updatedShots = shots.map((currentShot) => {
        const scriptSegment = shotScript.segments.find(
          (item) =>
            item.segmentId === currentShot.segmentId && item.sceneId === currentShot.sceneId,
        );

        if (!scriptSegment) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const promptTextCurrent = buildSegmentVideoPrompt(promptTemplate, {
          segmentSummary: scriptSegment.summary,
          shotsSummary: scriptSegment.shots
            .map((shot) => `${shot.shotCode}: ${shot.action}`)
            .join("; "),
        });

        return {
          ...currentShot,
          promptTextCurrent,
          promptUpdatedAt: timestamp,
          updatedAt: timestamp,
        };
      });

      for (const shot of updatedShots) {
        await dependencies.videoRepository.updateSegment(shot);
      }

      return {
        currentBatch: toCurrentVideoBatchSummary(batch, updatedShots),
        shots: updatedShots,
      };
    },
  };
}
