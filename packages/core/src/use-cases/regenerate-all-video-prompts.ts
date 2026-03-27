import type { VideoListResponse } from "@sweet-star/shared";

import { toCurrentVideoBatchSummary } from "../domain/video";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";

export interface RegenerateAllVideoPromptsInput {
  projectId: string;
}

export interface RegenerateAllVideoPromptsUseCase {
  execute(input: RegenerateAllVideoPromptsInput): Promise<VideoListResponse>;
}

export interface RegenerateAllVideoPromptsUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotImageRepository: ShotImageRepository;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  videoPromptProvider: VideoPromptProvider;
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

      const timestamp = dependencies.clock.now();
      const shots = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);
      if (!dependencies.shotImageRepository.listShotsByBatchId) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }
      const shotReferences = await dependencies.shotImageRepository.listShotsByBatchId(
        batch.sourceImageBatchId,
      );
      const updatedShots = await Promise.all(shots.map(async (currentShot) => {
        const scriptSegment = shotScript.segments.find(
          (item) =>
            item.segmentId === currentShot.segmentId && item.sceneId === currentShot.sceneId,
        );

        if (!scriptSegment) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const scriptShot = scriptSegment.shots.find((item) => item.id === currentShot.shotId);
        const shotReference = shotReferences.find((item) => item.shotId === currentShot.shotId);

        if (!scriptShot || !shotReference) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const promptPlan = await dependencies.videoPromptProvider.generateVideoPrompt(
          buildVideoPromptProviderInput({
            projectId: project.id,
            segment: scriptSegment,
            shot: scriptShot,
            shotReference,
          }),
        );

        return {
          ...currentShot,
          promptTextCurrent: promptPlan.finalPrompt,
          promptUpdatedAt: timestamp,
          updatedAt: timestamp,
          _promptPlan: promptPlan,
        };
      }));

      for (const shot of updatedShots) {
        const { _promptPlan, ...persistedShot } = shot as typeof shot & {
          _promptPlan: Awaited<ReturnType<VideoPromptProvider["generateVideoPrompt"]>>;
        };
        await dependencies.videoRepository.updateSegment(persistedShot);
        await dependencies.videoStorage.writePromptPlan({
          segment: persistedShot,
          planning: {
            finalPrompt: _promptPlan.finalPrompt,
            dialoguePlan: _promptPlan.dialoguePlan,
            audioPlan: _promptPlan.audioPlan,
            visualGuardrails: _promptPlan.visualGuardrails,
            rationale: _promptPlan.rationale,
            provider: _promptPlan.provider,
            model: _promptPlan.model,
            rawResponse: _promptPlan.rawResponse,
          },
        });
      }

      return {
        currentBatch: toCurrentVideoBatchSummary(
          batch,
          updatedShots.map(({ _promptPlan: _unused, ...shot }) => shot),
        ),
        shots: updatedShots.map(({ _promptPlan: _unused, ...shot }) => shot),
      };
    },
  };
}
