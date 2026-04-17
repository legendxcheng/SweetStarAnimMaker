import { toShotScriptSegmentStorageKey } from "@sweet-star/shared";
import type { ImageFrameType } from "@sweet-star/shared";

import {
  toSegmentFrameCurrentImageRelPath,
  toSegmentFrameCurrentMetadataRelPath,
  toSegmentFramePlanningRelPath,
  toSegmentFramePromptCurrentRelPath,
  toSegmentFramePromptSeedRelPath,
  toSegmentFramePromptVersionsStorageDir,
  toSegmentFrameStorageDir,
  toSegmentFrameVersionsStorageDir,
  toShotImageBatchManifestRelPath,
  toShotImageBatchStorageDir,
  toShotReferenceFrameCurrentImageRelPath,
  toShotReferenceFrameCurrentMetadataRelPath,
  toShotReferenceFramePlanningRelPath,
  toShotReferenceFramePromptCurrentRelPath,
  toShotReferenceFramePromptSeedRelPath,
  toShotReferenceFramePromptVersionsStorageDir,
  toShotReferenceFrameStorageDir,
  toShotReferenceFrameVersionsStorageDir,
  toShotReferenceManifestRelPath,
  toShotReferenceStorageDir,
  toShotReferenceStorageKey,
} from "./paths";
import type {
  CreateSegmentFrameRecordInput,
  CreateShotImageBatchRecordInput,
  CreateShotReferenceBatchRecordInput,
  CreateShotReferenceRecordInput,
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
  ShotReferenceBatchRecord,
  ShotReferenceFrameEntity,
  ShotReferenceRecordEntity,
  ShotReferenceSelector,
} from "./types";

export function createShotReferenceBatchRecord(
  input: CreateShotReferenceBatchRecordInput,
): ShotReferenceBatchRecord {
  const totalRequiredFrameCount = input.totalRequiredFrameCount ?? input.shotCount * 2;

  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    shotCount: input.shotCount,
    totalRequiredFrameCount,
    storageDir: toShotImageBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toShotImageBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    segmentCount: input.shotCount,
    totalFrameCount: totalRequiredFrameCount,
  };
}

export function createShotImageBatchRecord(
  input: CreateShotImageBatchRecordInput,
): ShotImageBatchRecord {
  return createShotReferenceBatchRecord({
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    shotCount: input.segmentCount,
    totalRequiredFrameCount: input.totalFrameCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}

export function createShotReferenceRecord(
  input: CreateShotReferenceRecordInput,
): ShotReferenceRecordEntity {
  const selector = {
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    shotId: input.shotId,
  };

  const startFrame = createShotReferenceFrameEntity({
    batchId: input.batchId,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    selector,
    shotOrder: input.shotOrder,
    frameType: "start_frame",
    updatedAt: input.updatedAt,
    frame: input.startFrame,
  });
  const baseRecord = {
    id: input.id,
    batchId: input.batchId,
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
    frameDependency: input.frameDependency,
    referenceStatus: input.referenceStatus ?? "pending",
    updatedAt: input.updatedAt,
    storageDir: `${input.projectStorageDir}/${toShotReferenceStorageDir(input.batchId, selector)}`,
    manifestRelPath: toShotReferenceManifestRelPath(input.batchId, selector),
    startFrame,
  };

  if (input.frameDependency === "start_and_end_frame") {
    return {
      ...baseRecord,
      frameDependency: "start_and_end_frame",
      endFrame: createShotReferenceFrameEntity({
        batchId: input.batchId,
        projectId: input.projectId,
        projectStorageDir: input.projectStorageDir,
        sourceShotScriptId: input.sourceShotScriptId,
        selector,
        shotOrder: input.shotOrder,
        frameType: "end_frame",
        updatedAt: input.updatedAt,
        frame: input.endFrame ?? undefined,
      }),
    };
  }

  return {
    ...baseRecord,
    frameDependency: "start_frame_only",
    endFrame: null,
  };
}

export function createSegmentFrameRecord(
  input: CreateSegmentFrameRecordInput,
): SegmentFrameRecordEntity {
  const segmentStorageKey = toShotScriptSegmentStorageKey({
    sceneId: input.sceneId,
    segmentId: input.segmentId,
  });

  return {
    id: input.id,
    batchId: input.batchId,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentId: input.segmentId,
    sceneId: input.sceneId,
    order: input.order,
    frameType: input.frameType,
    planStatus: input.planStatus ?? "pending",
    imageStatus: input.imageStatus ?? "pending",
    selectedCharacterIds: input.selectedCharacterIds ?? [],
    matchedReferenceImagePaths: input.matchedReferenceImagePaths ?? [],
    unmatchedCharacterIds: input.unmatchedCharacterIds ?? [],
    promptTextSeed: input.promptTextSeed ?? "",
    promptTextCurrent: input.promptTextCurrent ?? "",
    negativePromptTextCurrent: input.negativePromptTextCurrent ?? null,
    promptUpdatedAt: input.promptUpdatedAt ?? null,
    imageAssetPath: input.imageAssetPath ?? null,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    approvedAt: input.approvedAt ?? null,
    updatedAt: input.updatedAt,
    sourceTaskId: input.sourceTaskId ?? null,
    storageDir: `${input.projectStorageDir}/${toSegmentFrameStorageDir(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    )}`,
    planningRelPath: toSegmentFramePlanningRelPath(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    promptSeedRelPath: toSegmentFramePromptSeedRelPath(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    promptCurrentRelPath: toSegmentFramePromptCurrentRelPath(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    currentImageRelPath: toSegmentFrameCurrentImageRelPath(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    currentMetadataRelPath: toSegmentFrameCurrentMetadataRelPath(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    promptVersionsStorageDir: toSegmentFramePromptVersionsStorageDir(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
    versionsStorageDir: toSegmentFrameVersionsStorageDir(
      input.batchId,
      segmentStorageKey,
      input.frameType,
    ),
  };
}

function createShotReferenceFrameEntity(input: {
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  selector: ShotReferenceSelector;
  shotOrder: number;
  frameType: ImageFrameType;
  updatedAt: string;
  frame?: Partial<ShotReferenceFrameEntity>;
}): ShotReferenceFrameEntity {
  const frame = input.frame;
  const token = input.frameType === "start_frame" ? "start" : "end";
  const id = frame?.id ?? `frame_${input.batchId}_${toShotReferenceStorageKey(input.selector)}_${token}`;

  return {
    id,
    batchId: input.batchId,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentId: input.selector.segmentId,
    sceneId: input.selector.sceneId,
    order: input.shotOrder,
    frameType: input.frameType,
    planStatus: frame?.planStatus ?? "pending",
    imageStatus: frame?.imageStatus ?? "pending",
    selectedCharacterIds: frame?.selectedCharacterIds ?? [],
    matchedReferenceImagePaths: frame?.matchedReferenceImagePaths ?? [],
    unmatchedCharacterIds: frame?.unmatchedCharacterIds ?? [],
    promptTextSeed: frame?.promptTextSeed ?? "",
    promptTextCurrent: frame?.promptTextCurrent ?? "",
    negativePromptTextCurrent: frame?.negativePromptTextCurrent ?? null,
    promptUpdatedAt: frame?.promptUpdatedAt ?? null,
    imageAssetPath: frame?.imageAssetPath ?? null,
    imageWidth: frame?.imageWidth ?? null,
    imageHeight: frame?.imageHeight ?? null,
    provider: frame?.provider ?? null,
    model: frame?.model ?? null,
    approvedAt: frame?.approvedAt ?? null,
    updatedAt: frame?.updatedAt ?? input.updatedAt,
    sourceTaskId: frame?.sourceTaskId ?? null,
    storageDir: `${input.projectStorageDir}/${toShotReferenceFrameStorageDir(
      input.batchId,
      input.selector,
      input.frameType,
    )}`,
    planningRelPath:
      frame?.planningRelPath ??
      toShotReferenceFramePlanningRelPath(input.batchId, input.selector, input.frameType),
    promptSeedRelPath:
      frame?.promptSeedRelPath ??
      toShotReferenceFramePromptSeedRelPath(input.batchId, input.selector, input.frameType),
    promptCurrentRelPath:
      frame?.promptCurrentRelPath ??
      toShotReferenceFramePromptCurrentRelPath(input.batchId, input.selector, input.frameType),
    currentImageRelPath:
      frame?.currentImageRelPath ??
      toShotReferenceFrameCurrentImageRelPath(input.batchId, input.selector, input.frameType),
    currentMetadataRelPath:
      frame?.currentMetadataRelPath ??
      toShotReferenceFrameCurrentMetadataRelPath(input.batchId, input.selector, input.frameType),
    promptVersionsStorageDir:
      frame?.promptVersionsStorageDir ??
      toShotReferenceFramePromptVersionsStorageDir(
        input.batchId,
        input.selector,
        input.frameType,
      ),
    versionsStorageDir:
      frame?.versionsStorageDir ??
      toShotReferenceFrameVersionsStorageDir(input.batchId, input.selector, input.frameType),
  };
}
