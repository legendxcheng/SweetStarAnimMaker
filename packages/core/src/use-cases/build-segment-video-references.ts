import type {
  SegmentVideoReferenceImage,
  ShotScriptSegment,
  VideoReferenceStrategy,
} from "@sweet-star/shared";

import type { CharacterSheetRecordEntity } from "../domain/character-sheet";
import type { SceneSheetRecordEntity } from "../domain/scene-sheet";
import type { ShotReferenceRecordEntity } from "../domain/shot-image/types";

const defaultReferenceImageLimit = 6;

type CandidateReference = {
  assetPath: string;
  sourceShotId: string | null;
  shotOrder: number;
  referenceKey: string;
  label: string | null;
  frameRole?: "first_frame" | "last_frame" | null;
};

export function buildSegmentVideoReferences(input: {
  strategy: VideoReferenceStrategy;
  segment: ShotScriptSegment;
  shotReferences: ShotReferenceRecordEntity[];
  sceneSheet?: SceneSheetRecordEntity | null;
  characterSheets?: CharacterSheetRecordEntity[];
  selectedSceneId?: string | null;
  selectedCharacterIds?: string[];
  limit?: number;
}): SegmentVideoReferenceImage[] {
  const sceneAndCharacterReferences = buildSceneAndCharacterReferences(input);

  if (input.strategy === "without_frame_refs") {
    return sceneAndCharacterReferences;
  }

  return combineReferenceImages(
    [...sceneAndCharacterReferences, ...buildFrameReferences(input)],
    input.limit ?? defaultReferenceImageLimit,
  );
}

export function buildVideoPromptCharacterCandidates(characterSheets: CharacterSheetRecordEntity[]) {
  return characterSheets
    .filter((characterSheet) => characterSheet.status === "approved")
    .map((characterSheet) => ({
      id: characterSheet.id,
      characterName: characterSheet.characterName,
      promptTextCurrent: characterSheet.promptTextCurrent,
      imageAssetPath: characterSheet.imageAssetPath?.trim() ?? "",
    }))
    .filter((candidate) => candidate.imageAssetPath);
}

export function buildVideoPromptSceneCandidates(sceneSheets: SceneSheetRecordEntity[]) {
  return sceneSheets
    .filter((sceneSheet) => sceneSheet.status === "approved")
    .map((sceneSheet) => ({
      id: sceneSheet.id,
      sceneName: sceneSheet.sceneName,
      scenePurpose: sceneSheet.scenePurpose,
      promptTextCurrent: sceneSheet.promptTextCurrent,
      constraintsText: sceneSheet.constraintsText ?? null,
      imageAssetPath: sceneSheet.imageAssetPath?.trim() ?? "",
    }))
    .filter((candidate) => candidate.imageAssetPath);
}

function combineReferenceImages(
  references: SegmentVideoReferenceImage[],
  limit: number,
): SegmentVideoReferenceImage[] {
  const seenAssetPaths = new Set<string>();

  return references
    .filter((reference) => {
      if (seenAssetPaths.has(reference.assetPath)) {
        return false;
      }

      seenAssetPaths.add(reference.assetPath);
      return true;
    })
    .slice(0, limit)
    .map((reference, index) => ({
      ...reference,
      order: index,
    }));
}

function buildFrameReferences(input: {
  segment: ShotScriptSegment;
  shotReferences: ShotReferenceRecordEntity[];
  limit?: number;
}): SegmentVideoReferenceImage[] {
  const limit = input.limit ?? defaultReferenceImageLimit;
  const seenAssetPaths = new Set<string>();
  const candidates: CandidateReference[] = [];

  for (const shot of [...input.segment.shots].sort((left, right) => left.order - right.order)) {
    const shotReference = input.shotReferences.find(
      (item) =>
        item.sceneId === shot.sceneId &&
        item.segmentId === shot.segmentId &&
        item.shotId === shot.id,
    );

    if (!shotReference) {
      continue;
    }

    const startAssetPath = shotReference.startFrame.imageAssetPath?.trim();
    if (startAssetPath) {
      candidates.push({
        assetPath: startAssetPath,
        sourceShotId: shot.id,
        shotOrder: shot.order,
        referenceKey: `${shot.id}_start_frame`,
        label: `${shot.shotCode} start`,
        frameRole: "first_frame",
      });
    }

    const endAssetPath = shotReference.endFrame?.imageAssetPath?.trim();
    if (endAssetPath && endAssetPath !== startAssetPath) {
      candidates.push({
        assetPath: endAssetPath,
        sourceShotId: shot.id,
        shotOrder: shot.order,
        referenceKey: `${shot.id}_end_frame`,
        label: `${shot.shotCode} end`,
        frameRole: "last_frame",
      });
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.shotOrder !== right.shotOrder) {
        return left.shotOrder - right.shotOrder;
      }

      if (left.referenceKey === right.referenceKey) {
        return 0;
      }

      return left.referenceKey.endsWith("start_frame") ? -1 : 1;
    })
    .filter((candidate) => {
      if (seenAssetPaths.has(candidate.assetPath)) {
        return false;
      }

      seenAssetPaths.add(candidate.assetPath);
      return true;
    })
    .slice(0, limit)
    .map((candidate, index) => ({
      id: `video_ref_image_${input.segment.segmentId}_${candidate.referenceKey}`,
      assetPath: candidate.assetPath,
      source: "auto",
      order: index,
      sourceShotId: candidate.sourceShotId,
      label: candidate.label,
      frameRole: candidate.frameRole ?? null,
    }));
}

function buildSceneAndCharacterReferences(input: {
  segment: ShotScriptSegment;
  sceneSheet?: SceneSheetRecordEntity | null;
  characterSheets?: CharacterSheetRecordEntity[];
  selectedSceneId?: string | null;
  selectedCharacterIds?: string[];
  limit?: number;
}): SegmentVideoReferenceImage[] {
  const limit = input.limit ?? defaultReferenceImageLimit;
  const seenAssetPaths = new Set<string>();
  const candidates: CandidateReference[] = [];

  const selectedSceneSheet = input.selectedSceneId
    ? input.sceneSheet?.id === input.selectedSceneId
      ? input.sceneSheet
      : null
    : input.sceneSheet;

  if (selectedSceneSheet?.status === "approved") {
    const assetPath = selectedSceneSheet.imageAssetPath?.trim();
    if (assetPath) {
      candidates.push({
        assetPath,
        sourceShotId: null,
        shotOrder: -1,
        referenceKey: `scene_${selectedSceneSheet.id}`,
        label: `Scene ${selectedSceneSheet.sceneName}`,
      });
    }
  }

  const selectedCharacterIds = new Set(input.selectedCharacterIds ?? []);
  for (const characterSheet of input.characterSheets ?? []) {
    if (!selectedCharacterIds.has(characterSheet.id)) {
      continue;
    }

    if (characterSheet.status !== "approved") {
      continue;
    }

    const assetPath = characterSheet.imageAssetPath?.trim();
    if (!assetPath) {
      continue;
    }

    candidates.push({
      assetPath,
      sourceShotId: null,
      shotOrder: candidates.length,
      referenceKey: `character_${characterSheet.id}`,
      label: `Character ${characterSheet.characterName}`,
    });
  }

  return candidates
    .filter((candidate) => {
      if (seenAssetPaths.has(candidate.assetPath)) {
        return false;
      }

      seenAssetPaths.add(candidate.assetPath);
      return true;
    })
    .slice(0, limit)
    .map((candidate, index) => ({
      id: `video_ref_image_${input.segment.segmentId}_${candidate.referenceKey}`,
      assetPath: candidate.assetPath,
      source: "auto",
      order: index,
      sourceShotId: candidate.sourceShotId,
      label: candidate.label,
    }));
}
