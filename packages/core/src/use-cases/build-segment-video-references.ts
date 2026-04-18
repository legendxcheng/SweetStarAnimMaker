import type { SegmentVideoReferenceImage, ShotScriptSegment } from "@sweet-star/shared";

import type { ShotReferenceRecordEntity } from "../domain/shot-image/types";

const defaultReferenceImageLimit = 6;

type CandidateReference = {
  assetPath: string;
  sourceShotId: string;
  shotOrder: number;
  frameRole: "start_frame" | "end_frame";
  label: string | null;
};

export function buildSegmentVideoReferences(input: {
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
        frameRole: "start_frame",
        label: `${shot.shotCode} start`,
      });
    }

    const endAssetPath = shotReference.endFrame?.imageAssetPath?.trim();
    if (endAssetPath && endAssetPath !== startAssetPath) {
      candidates.push({
        assetPath: endAssetPath,
        sourceShotId: shot.id,
        shotOrder: shot.order,
        frameRole: "end_frame",
        label: `${shot.shotCode} end`,
      });
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.shotOrder !== right.shotOrder) {
        return left.shotOrder - right.shotOrder;
      }

      if (left.frameRole === right.frameRole) {
        return 0;
      }

      return left.frameRole === "start_frame" ? -1 : 1;
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
      id: `video_ref_image_${input.segment.segmentId}_${candidate.sourceShotId}_${candidate.frameRole}`,
      assetPath: candidate.assetPath,
      source: "auto",
      order: index,
      sourceShotId: candidate.sourceShotId,
      label: candidate.label,
    }));
}
