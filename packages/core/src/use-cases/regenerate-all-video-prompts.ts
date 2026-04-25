import type { VideoListResponse } from "@sweet-star/shared";

import { toCurrentVideoBatchSummary, toPublicSegmentVideoRecord } from "../domain/video";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { CurrentVideoBatchNotFoundError } from "../errors/video-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { buildPersistedSegmentShotReference } from "./build-persisted-segment-shot-reference";
import {
  buildSegmentVideoReferences,
  buildVideoPromptCharacterCandidates,
  buildVideoPromptSceneCandidates,
} from "./build-segment-video-references";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";
import { deriveProjectVideoStatus } from "./derive-project-video-status";

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
  characterSheetRepository: CharacterSheetRepository;
  sceneSheetRepository: SceneSheetRepository;
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
      const segments = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);
      const shotReferences = dependencies.shotImageRepository.listShotsByBatchId
        ? await dependencies.shotImageRepository.listShotsByBatchId(batch.sourceImageBatchId)
        : [];
      const characterSheets = project.currentCharacterSheetBatchId
        ? await dependencies.characterSheetRepository.listCharactersByBatchId(
            project.currentCharacterSheetBatchId,
          )
        : [];
      const sceneSheets = project.currentSceneSheetBatchId
        ? await dependencies.sceneSheetRepository.listScenesByBatchId(project.currentSceneSheetBatchId)
        : [];
      const updatedSegments = await Promise.all(segments.map(async (currentSegment) => {
        const scriptSegment = shotScript.segments.find(
          (item) =>
            item.segmentId === currentSegment.segmentId &&
            item.sceneId === currentSegment.sceneId,
        );

        if (!scriptSegment) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const scriptShot = scriptSegment.shots.find((item) => item.id === currentSegment.shotId);

        if (!scriptShot) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const frameReferenceImages = buildSegmentVideoReferences({
          strategy: project.videoReferenceStrategy,
          segment: scriptSegment,
          shotReferences: shotReferences.filter(
            (item) => item.sceneId === currentSegment.sceneId && item.segmentId === currentSegment.segmentId,
          ),
        });

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
          referenceImages: frameReferenceImages,
        });

        const promptPlan = await dependencies.videoPromptProvider.generateVideoPrompt(
          buildVideoPromptProviderInput({
            projectId: project.id,
            segment: scriptSegment,
            shot: scriptShot,
            shotReference,
            referenceImages: frameReferenceImages,
            characterCandidates: buildVideoPromptCharacterCandidates(characterSheets),
            sceneCandidates: buildVideoPromptSceneCandidates(sceneSheets),
          }),
        );
        const referenceImages = buildSegmentVideoReferences({
          strategy: project.videoReferenceStrategy,
          segment: scriptSegment,
          shotReferences: shotReferences.filter(
            (item) => item.sceneId === currentSegment.sceneId && item.segmentId === currentSegment.segmentId,
          ),
          sceneSheet: sceneSheets.find((sceneSheet) => sceneSheet.id === promptPlan.selectedSceneId) ?? null,
          characterSheets,
          selectedSceneId: promptPlan.selectedSceneId ?? null,
          selectedCharacterIds: promptPlan.selectedCharacterIds ?? [],
        });

        return {
          ...currentSegment,
          status: currentSegment.status === "approved" ? ("in_review" as const) : currentSegment.status,
          approvedAt: currentSegment.status === "approved" ? null : currentSegment.approvedAt,
          referenceImages,
          promptTextCurrent: promptPlan.finalPrompt,
          promptUpdatedAt: timestamp,
          updatedAt: timestamp,
          _promptPlan: promptPlan,
        };
      }));

      for (const segment of updatedSegments) {
        const { _promptPlan, ...persistedSegment } = segment as typeof segment & {
          _promptPlan: Awaited<ReturnType<VideoPromptProvider["generateVideoPrompt"]>>;
        };
        await dependencies.videoRepository.updateSegment(persistedSegment);
        await dependencies.videoStorage.writePromptPlan({
          segment: persistedSegment,
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

      const persistedSegments = updatedSegments.map(({ _promptPlan: _unused, ...segment }) => segment);
      const [firstSegment, ...remainingSegments] = persistedSegments;

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: firstSegment
          ? deriveProjectVideoStatus(remainingSegments, firstSegment)
          : "videos_in_review",
        updatedAt: timestamp,
      });

      return {
        currentBatch: toCurrentVideoBatchSummary(
          batch,
          persistedSegments,
        ),
        segments: persistedSegments.map(toPublicSegmentVideoRecord),
      };
    },
  };
}
