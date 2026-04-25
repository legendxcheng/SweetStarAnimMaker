import type { SegmentVideoRecord } from "@sweet-star/shared";

import { toPublicSegmentVideoRecord } from "../domain/video";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";
import { buildPersistedSegmentShotReference } from "./build-persisted-segment-shot-reference";
import {
  buildSegmentVideoReferences,
  buildVideoPromptCharacterCandidates,
  buildVideoPromptSceneCandidates,
} from "./build-segment-video-references";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { deriveProjectVideoStatus } from "./derive-project-video-status";

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
  characterSheetRepository: CharacterSheetRepository;
  sceneSheetRepository: SceneSheetRepository;
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

      if (
        !currentSegment ||
        currentSegment.projectId !== project.id ||
        currentSegment.batchId !== project.currentVideoBatchId
      ) {
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

      const shotReferences = dependencies.shotImageRepository.listShotsByBatchId
        ? await dependencies.shotImageRepository.listShotsByBatchId(currentSegment.sourceImageBatchId)
        : [];
      const characterSheets = project.currentCharacterSheetBatchId
        ? await dependencies.characterSheetRepository.listCharactersByBatchId(
            project.currentCharacterSheetBatchId,
          )
        : [];
      const sceneSheets = project.currentSceneSheetBatchId
        ? await dependencies.sceneSheetRepository.listScenesByBatchId(project.currentSceneSheetBatchId)
        : [];
      const frameReferenceImages = buildSegmentVideoReferences({
        strategy: project.videoReferenceStrategy,
        segment,
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
          segment,
          shot,
          shotReference,
          referenceImages: frameReferenceImages,
          characterCandidates: buildVideoPromptCharacterCandidates(characterSheets),
          sceneCandidates: buildVideoPromptSceneCandidates(sceneSheets),
        }),
      );
      const referenceImages = buildSegmentVideoReferences({
        strategy: project.videoReferenceStrategy,
        segment,
        shotReferences: shotReferences.filter(
          (item) => item.sceneId === currentSegment.sceneId && item.segmentId === currentSegment.segmentId,
        ),
        sceneSheet: sceneSheets.find((sceneSheet) => sceneSheet.id === promptPlan.selectedSceneId) ?? null,
        characterSheets,
        selectedSceneId: promptPlan.selectedSceneId ?? null,
        selectedCharacterIds: promptPlan.selectedCharacterIds ?? [],
      });
      const promptTextCurrent = promptPlan.finalPrompt;
      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...currentSegment,
        status: currentSegment.status === "approved" ? ("in_review" as const) : currentSegment.status,
        approvedAt: currentSegment.status === "approved" ? null : currentSegment.approvedAt,
        referenceImages,
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
      const segments = await dependencies.videoRepository.listSegmentsByBatchId(currentSegment.batchId);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: deriveProjectVideoStatus(segments, updatedSegment),
        updatedAt: timestamp,
      });

      return toPublicSegmentVideoRecord(updatedSegment);
    },
  };
}
