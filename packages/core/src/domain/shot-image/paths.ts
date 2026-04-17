import type { ImageFrameType } from "@sweet-star/shared";

import {
  shotImageBatchesDirectoryName,
  shotImageCurrentBatchFileName,
  shotImageCurrentImageFileName,
  shotImageCurrentMetadataFileName,
  shotImageManifestFileName,
  shotImagePlanningFileName,
  shotImagePromptCurrentFileName,
  shotImagePromptSeedFileName,
  shotImagePromptVersionsDirectoryName,
  shotImageSegmentsDirectoryName,
  shotImageShotsDirectoryName,
  shotImageVersionsDirectoryName,
  shotImagesDirectoryName,
} from "./constants";
import type { ShotReferenceSelector } from "./types";

export function toShotImageBatchStorageDir(projectStorageDir: string, batchId: string) {
  return `${projectStorageDir}/${shotImagesDirectoryName}/${shotImageBatchesDirectoryName}/${batchId}`;
}

export function toShotImageBatchManifestRelPath(batchId: string) {
  return `${shotImagesDirectoryName}/${shotImageBatchesDirectoryName}/${batchId}/${shotImageManifestFileName}`;
}

export function toShotImageCurrentBatchRelPath() {
  return `${shotImagesDirectoryName}/${shotImageCurrentBatchFileName}`;
}

export function toShotReferenceStorageKey(selector: ShotReferenceSelector) {
  return `${selector.sceneId}__${selector.segmentId}__${selector.shotId}`;
}

export function toShotReferenceStorageDir(batchId: string, selector: ShotReferenceSelector) {
  return `${shotImagesDirectoryName}/${shotImageBatchesDirectoryName}/${batchId}/${shotImageShotsDirectoryName}/${toShotReferenceStorageKey(selector)}`;
}

export function toShotReferenceManifestRelPath(batchId: string, selector: ShotReferenceSelector) {
  return `${toShotReferenceStorageDir(batchId, selector)}/${shotImageManifestFileName}`;
}

export function toShotReferenceFrameStorageDir(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceStorageDir(batchId, selector)}/${toFrameDirectoryName(frameType)}`;
}

export function toShotReferenceFramePlanningRelPath(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImagePlanningFileName}`;
}

export function toShotReferenceFramePromptSeedRelPath(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImagePromptSeedFileName}`;
}

export function toShotReferenceFramePromptCurrentRelPath(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImagePromptCurrentFileName}`;
}

export function toShotReferenceFrameCurrentImageRelPath(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImageCurrentImageFileName}`;
}

export function toShotReferenceFrameCurrentMetadataRelPath(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImageCurrentMetadataFileName}`;
}

export function toShotReferenceFramePromptVersionsStorageDir(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImagePromptVersionsDirectoryName}`;
}

export function toShotReferenceFrameVersionsStorageDir(
  batchId: string,
  selector: ShotReferenceSelector,
  frameType: ImageFrameType,
) {
  return `${toShotReferenceFrameStorageDir(batchId, selector, frameType)}/${shotImageVersionsDirectoryName}`;
}

export function toSegmentFrameStorageDir(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${shotImagesDirectoryName}/${shotImageBatchesDirectoryName}/${batchId}/${shotImageSegmentsDirectoryName}/${segmentId}/${toFrameDirectoryName(frameType)}`;
}

export function toSegmentFramePlanningRelPath(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImagePlanningFileName}`;
}

export function toSegmentFramePromptSeedRelPath(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImagePromptSeedFileName}`;
}

export function toSegmentFramePromptCurrentRelPath(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImagePromptCurrentFileName}`;
}

export function toSegmentFrameCurrentImageRelPath(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImageCurrentImageFileName}`;
}

export function toSegmentFrameCurrentMetadataRelPath(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImageCurrentMetadataFileName}`;
}

export function toSegmentFramePromptVersionsStorageDir(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImagePromptVersionsDirectoryName}`;
}

export function toSegmentFrameVersionsStorageDir(
  batchId: string,
  segmentId: string,
  frameType: ImageFrameType,
) {
  return `${toSegmentFrameStorageDir(batchId, segmentId, frameType)}/${shotImageVersionsDirectoryName}`;
}

function toFrameDirectoryName(frameType: ImageFrameType) {
  return frameType === "start_frame" ? "start-frame" : "end-frame";
}
