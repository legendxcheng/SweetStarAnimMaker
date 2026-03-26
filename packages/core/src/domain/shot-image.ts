import type {
  CurrentImageBatch,
  ImageFramePlanStatus,
  ImageFrameStatus,
  ImageFrameType,
  ShotFrameDependency,
  ShotReferenceFrame,
  ShotReferenceRecord,
  ShotReferenceStatus,
} from "@sweet-star/shared";
import { toShotScriptSegmentStorageKey } from "@sweet-star/shared";

export const shotImagesDirectoryName = "images";
export const shotImageBatchesDirectoryName = "batches";
export const shotImageShotsDirectoryName = "shots";
export const shotImageSegmentsDirectoryName = "segments";
export const shotImageCurrentBatchFileName = "current-batch.json";
export const shotImageManifestFileName = "manifest.json";
export const shotImagePlanningFileName = "planning.json";
export const shotImagePromptSeedFileName = "prompt.seed.txt";
export const shotImagePromptCurrentFileName = "prompt.current.txt";
export const shotImageCurrentImageFileName = "current.png";
export const shotImageCurrentMetadataFileName = "current.json";
export const shotImagePromptVersionsDirectoryName = "prompt.versions";
export const shotImageVersionsDirectoryName = "versions";

export interface ShotReferenceBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  shotCount: number;
  totalRequiredFrameCount: number;
  storageDir: string;
  manifestRelPath: string;
  createdAt: string;
  updatedAt: string;
  // Temporary aliases for the still-segment-first use cases that will move in the next tasks.
  segmentCount: number;
  totalFrameCount: number;
}

export type ShotImageBatchRecord = ShotReferenceBatchRecord;

export interface CreateShotReferenceBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  shotCount: number;
  totalRequiredFrameCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShotImageBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  segmentCount: number;
  totalFrameCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShotReferenceSelector {
  sceneId: string;
  segmentId: string;
  shotId: string;
}

export interface ShotReferenceFrameEntity extends ShotReferenceFrame {
  projectStorageDir: string;
  storageDir: string;
  planningRelPath: string;
  promptSeedRelPath: string;
  promptCurrentRelPath: string;
  currentImageRelPath: string;
  currentMetadataRelPath: string;
  promptVersionsStorageDir: string;
  versionsStorageDir: string;
}

interface ShotReferenceRecordEntityBase {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  shotId: string;
  shotCode: string;
  segmentOrder: number;
  shotOrder: number;
  durationSec: number | null;
  referenceStatus: ShotReferenceStatus;
  projectStorageDir: string;
  storageDir: string;
  manifestRelPath: string;
  startFrame: ShotReferenceFrameEntity;
  updatedAt: string;
}

export type StartFrameOnlyShotReferenceRecordEntity = ShotReferenceRecordEntityBase & {
  frameDependency: "start_frame_only";
  endFrame: null;
};

export type StartAndEndShotReferenceRecordEntity = ShotReferenceRecordEntityBase & {
  frameDependency: "start_and_end_frame";
  endFrame: ShotReferenceFrameEntity;
};

export type ShotReferenceRecordEntity =
  | StartFrameOnlyShotReferenceRecordEntity
  | StartAndEndShotReferenceRecordEntity;

export interface CreateShotReferenceRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  shotId: string;
  shotCode: string;
  segmentOrder: number;
  shotOrder: number;
  durationSec: number | null;
  frameDependency: ShotFrameDependency;
  referenceStatus?: ShotReferenceStatus;
  startFrame?: Partial<ShotReferenceFrameEntity>;
  endFrame?: Partial<ShotReferenceFrameEntity> | null;
  updatedAt: string;
}

interface LegacySegmentFrameRecord {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  frameType: ImageFrameType;
  planStatus: ImageFramePlanStatus;
  imageStatus: ImageFrameStatus;
  selectedCharacterIds: string[];
  matchedReferenceImagePaths: string[];
  unmatchedCharacterIds: string[];
  promptTextSeed: string;
  promptTextCurrent: string;
  negativePromptTextCurrent: string | null;
  promptUpdatedAt: string | null;
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  approvedAt: string | null;
  updatedAt: string;
  sourceTaskId: string | null;
}

export interface SegmentFrameRecordEntity extends LegacySegmentFrameRecord {
  projectStorageDir: string;
  storageDir: string;
  planningRelPath: string;
  promptSeedRelPath: string;
  promptCurrentRelPath: string;
  currentImageRelPath: string;
  currentMetadataRelPath: string;
  promptVersionsStorageDir: string;
  versionsStorageDir: string;
}

export interface CreateSegmentFrameRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  frameType: ImageFrameType;
  planStatus?: ImageFramePlanStatus;
  imageStatus?: ImageFrameStatus;
  selectedCharacterIds?: string[];
  matchedReferenceImagePaths?: string[];
  unmatchedCharacterIds?: string[];
  promptTextSeed?: string;
  promptTextCurrent?: string;
  negativePromptTextCurrent?: string | null;
  promptUpdatedAt?: string | null;
  imageAssetPath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  provider?: string | null;
  model?: string | null;
  approvedAt?: string | null;
  updatedAt: string;
  sourceTaskId?: string | null;
}

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

export function toCurrentImageBatch(
  batch: Pick<
    ShotReferenceBatchRecord,
    "id" | "sourceShotScriptId" | "shotCount" | "totalRequiredFrameCount" | "updatedAt"
  >,
  records: Array<
    | Pick<ShotReferenceRecord, "referenceStatus">
    | Pick<LegacySegmentFrameRecord, "imageStatus">
  >,
): CurrentImageBatch {
  return {
    id: batch.id,
    sourceShotScriptId: batch.sourceShotScriptId,
    shotCount: batch.shotCount,
    totalRequiredFrameCount: batch.totalRequiredFrameCount,
    approvedShotCount: records.filter((record) =>
      "referenceStatus" in record
        ? record.referenceStatus === "approved"
        : record.imageStatus === "approved",
    ).length,
    updatedAt: batch.updatedAt,
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
  const token = input.frameType === "start_frame" ? "start" : "end";
  const id =
    input.frame?.id ??
    `frame_${input.batchId}_${toShotReferenceStorageKey(input.selector)}_${token}`;

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
    planStatus: input.frame?.planStatus ?? "pending",
    imageStatus: input.frame?.imageStatus ?? "pending",
    selectedCharacterIds: input.frame?.selectedCharacterIds ?? [],
    matchedReferenceImagePaths: input.frame?.matchedReferenceImagePaths ?? [],
    unmatchedCharacterIds: input.frame?.unmatchedCharacterIds ?? [],
    promptTextSeed: input.frame?.promptTextSeed ?? "",
    promptTextCurrent: input.frame?.promptTextCurrent ?? "",
    negativePromptTextCurrent: input.frame?.negativePromptTextCurrent ?? null,
    promptUpdatedAt: input.frame?.promptUpdatedAt ?? null,
    imageAssetPath: input.frame?.imageAssetPath ?? null,
    imageWidth: input.frame?.imageWidth ?? null,
    imageHeight: input.frame?.imageHeight ?? null,
    provider: input.frame?.provider ?? null,
    model: input.frame?.model ?? null,
    approvedAt: input.frame?.approvedAt ?? null,
    updatedAt: input.frame?.updatedAt ?? input.updatedAt,
    sourceTaskId: input.frame?.sourceTaskId ?? null,
    storageDir: `${input.projectStorageDir}/${toShotReferenceFrameStorageDir(
      input.batchId,
      input.selector,
      input.frameType,
    )}`,
    planningRelPath:
      input.frame?.planningRelPath ??
      toShotReferenceFramePlanningRelPath(input.batchId, input.selector, input.frameType),
    promptSeedRelPath:
      input.frame?.promptSeedRelPath ??
      toShotReferenceFramePromptSeedRelPath(input.batchId, input.selector, input.frameType),
    promptCurrentRelPath:
      input.frame?.promptCurrentRelPath ??
      toShotReferenceFramePromptCurrentRelPath(input.batchId, input.selector, input.frameType),
    currentImageRelPath:
      input.frame?.currentImageRelPath ??
      toShotReferenceFrameCurrentImageRelPath(input.batchId, input.selector, input.frameType),
    currentMetadataRelPath:
      input.frame?.currentMetadataRelPath ??
      toShotReferenceFrameCurrentMetadataRelPath(input.batchId, input.selector, input.frameType),
    promptVersionsStorageDir:
      input.frame?.promptVersionsStorageDir ??
      toShotReferenceFramePromptVersionsStorageDir(
        input.batchId,
        input.selector,
        input.frameType,
      ),
    versionsStorageDir:
      input.frame?.versionsStorageDir ??
      toShotReferenceFrameVersionsStorageDir(input.batchId, input.selector, input.frameType),
  };
}

function toFrameDirectoryName(frameType: ImageFrameType) {
  return frameType === "start_frame" ? "start-frame" : "end-frame";
}
