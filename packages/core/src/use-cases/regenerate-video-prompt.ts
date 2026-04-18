import type { SegmentVideoRecord } from "@sweet-star/shared";

import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";
import { buildPersistedSegmentShotReference } from "./build-persisted-segment-shot-reference";
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
  shotImageRepository: ShotImageRepository;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  videoPromptProvider: VideoPromptProvider;
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

      const shot = segment.shots.find((item) => item.id === currentSegment.shotId);

      if (!shot) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const shotReference = buildPersistedSegmentShotReference({
        id: currentSegment.id,
        batchId: currentSegment.batchId,
        projectId: currentSegment.projectId,
        projectStorageDir: currentSegment.projectStorageDir,
        sourceShotScriptId: currentSegment.sourceShotScriptId,
        sourceImageBatchId: currentSegment.sourceImageBatchId,
        sceneId: currentSegment.sceneId,
        segmentId: currentSegment.segmentId,
        segmentOrder: currentSegment.segmentOrder,
        shotId: currentSegment.shotId,
        shotCode: currentSegment.shotCode,
        shotOrder: currentSegment.shotOrder,
        frameDependency: currentSegment.frameDependency,
        durationSec: currentSegment.durationSec,
        updatedAt: currentSegment.updatedAt,
        referenceImages: currentSegment.referenceImages,
      });

      const promptPlan = await dependencies.videoPromptProvider.generateVideoPrompt(
        buildVideoPromptProviderInput({
          projectId: project.id,
          segment,
          shot,
          shotReference,
        }),
      );
      const promptTextCurrent = promptPlan.finalPrompt;
      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...currentSegment,
        promptTextCurrent,
        promptUpdatedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);
      await dependencies.videoStorage.writePromptPlan({
        segment: updatedSegment,
        planning: {
          finalPrompt: promptPlan.finalPrompt,
          dialoguePlan: promptPlan.dialoguePlan,
          audioPlan: promptPlan.audioPlan,
          visualGuardrails: promptPlan.visualGuardrails,
          rationale: promptPlan.rationale,
          provider: promptPlan.provider,
          model: promptPlan.model,
          rawResponse: promptPlan.rawResponse,
        },
      });

      return updatedSegment;
    },
  };
}
