import type {
  CurrentImageBatch,
  ImageFramePlanStatus,
  ImageFrameStatus,
  ImageFrameType,
  SegmentFrameRecord,
} from "@sweet-star/shared";

export const shotImagesDirectoryName = "images";
export const shotImageBatchesDirectoryName = "batches";
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

export interface ShotImageBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  segmentCount: number;
  totalFrameCount: number;
  storageDir: string;
  manifestRelPath: string;
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

export interface SegmentFrameRecordEntity extends SegmentFrameRecord {
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

export function createShotImageBatchRecord(
  input: CreateShotImageBatchRecordInput,
): ShotImageBatchRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentCount: input.segmentCount,
    totalFrameCount: input.totalFrameCount ?? input.segmentCount * 2,
    storageDir: toShotImageBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toShotImageBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function createSegmentFrameRecord(
  input: CreateSegmentFrameRecordInput,
): SegmentFrameRecordEntity {
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
      input.segmentId,
      input.frameType,
    )}`,
    planningRelPath: toSegmentFramePlanningRelPath(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    promptSeedRelPath: toSegmentFramePromptSeedRelPath(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    promptCurrentRelPath: toSegmentFramePromptCurrentRelPath(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    currentImageRelPath: toSegmentFrameCurrentImageRelPath(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    currentMetadataRelPath: toSegmentFrameCurrentMetadataRelPath(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    promptVersionsStorageDir: toSegmentFramePromptVersionsStorageDir(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
    versionsStorageDir: toSegmentFrameVersionsStorageDir(
      input.batchId,
      input.segmentId,
      input.frameType,
    ),
  };
}

export function toCurrentImageBatch(
  batch: ShotImageBatchRecord,
  frames: Pick<SegmentFrameRecord, "imageStatus">[],
): CurrentImageBatch {
  return {
    id: batch.id,
    sourceShotScriptId: batch.sourceShotScriptId,
    segmentCount: batch.segmentCount,
    totalFrameCount: batch.totalFrameCount,
    approvedFrameCount: frames.filter((frame) => frame.imageStatus === "approved").length,
    updatedAt: batch.updatedAt,
  };
}

function toFrameDirectoryName(frameType: ImageFrameType) {
  return frameType === "start_frame" ? "start-frame" : "end-frame";
}
