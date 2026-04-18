import type { ShotFrameDependency } from "@sweet-star/shared";

import { createShotReferenceRecord } from "../domain/shot-image";

type PersistedSegmentReferenceInput = {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  sourceImageBatchId: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  shotId: string;
  shotCode: string;
  shotOrder: number;
  frameDependency: ShotFrameDependency;
  durationSec: number | null;
  updatedAt: string;
  referenceImages: Array<{
    assetPath: string;
  }>;
};

export function buildPersistedSegmentShotReference(input: PersistedSegmentReferenceInput) {
  const [startReference, endReference] = input.referenceImages;

  return createShotReferenceRecord({
    id: `shot_ref_${input.id}`,
    batchId: input.sourceImageBatchId,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    shotId: input.shotId,
    shotCode: input.shotCode,
    segmentOrder: input.segmentOrder,
    shotOrder: input.shotOrder,
    durationSec: input.durationSec,
    frameDependency: endReference ? "start_and_end_frame" : input.frameDependency,
    referenceStatus: "approved",
    startFrame: {
      imageAssetPath: startReference?.assetPath ?? null,
      imageWidth: null,
      imageHeight: null,
      updatedAt: input.updatedAt,
    },
    endFrame: endReference
      ? {
          imageAssetPath: endReference.assetPath,
          imageWidth: null,
          imageHeight: null,
          updatedAt: input.updatedAt,
        }
      : null,
    updatedAt: input.updatedAt,
  });
}
