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
};

export function buildSegmentVideoReferences(input: {
  strategy: VideoReferenceStrategy;
  segment: ShotScriptSegment;
  shotReferences: ShotReferenceRecordEntity[];
  sceneSheet?: SceneSheetRecordEntity | null;
  characterSheets?: CharacterSheetRecordEntity[];
  limit?: number;
}): SegmentVideoReferenceImage[] {
  if (input.strategy === "without_frame_refs") {
    return buildSceneAndCharacterReferences(input);
  }

  return buildFrameReferences(input);
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
    }));
}

function buildSceneAndCharacterReferences(input: {
  segment: ShotScriptSegment;
  sceneSheet?: SceneSheetRecordEntity | null;
  characterSheets?: CharacterSheetRecordEntity[];
  limit?: number;
}): SegmentVideoReferenceImage[] {
  const limit = input.limit ?? defaultReferenceImageLimit;
  const seenAssetPaths = new Set<string>();
  const candidates: CandidateReference[] = [];

  if (input.sceneSheet?.status === "approved") {
    const assetPath = input.sceneSheet.imageAssetPath?.trim();
    if (assetPath) {
      candidates.push({
        assetPath,
        sourceShotId: null,
        shotOrder: -1,
        referenceKey: `scene_${input.sceneSheet.id}`,
        label: `Scene ${input.sceneSheet.id}`,
      });
    }
  }

  for (const characterSheet of input.characterSheets ?? []) {
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
