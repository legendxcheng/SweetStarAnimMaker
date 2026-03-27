import type {
  CurrentVideoBatchSummary,
  ShotFrameDependency,
  ShotVideoRecord,
  ShotVideoStatus,
} from "@sweet-star/shared";

export const videosDirectoryName = "videos";
export const videoBatchesDirectoryName = "batches";
export const videoShotsDirectoryName = "shots";
export const videoSegmentsDirectoryName = "segments";
export const videoCurrentBatchFileName = "current-batch.json";
export const videoManifestFileName = "manifest.json";
export const videoCurrentFileName = "current.mp4";
export const videoCurrentMetadataFileName = "current.json";
export const videoThumbnailFileName = "thumbnail.webp";
export const videoVersionsDirectoryName = "versions";
export const videoPromptPlanFileName = "prompt.plan.json";

export interface VideoBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotCount: number;
  storageDir: string;
  manifestRelPath: string;
  createdAt: string;
  updatedAt: string;
  // Temporary alias while segment-first callers are still being migrated.
  segmentCount: number;
}

export interface ShotVideoRecordEntity extends ShotVideoRecord {
  projectStorageDir: string;
  storageDir: string;
  currentVideoRelPath: string;
  currentMetadataRelPath: string;
  thumbnailRelPath: string;
  versionsStorageDir: string;
}

export type SegmentVideoRecordEntity = ShotVideoRecordEntity;

export interface CreateVideoBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotCount?: number;
  segmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShotVideoRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  shotOrder: number;
  frameDependency: ShotFrameDependency;
  status?: ShotVideoStatus;
  promptTextSeed?: string;
  promptTextCurrent?: string;
  promptUpdatedAt?: string;
  videoAssetPath?: string | null;
  thumbnailAssetPath?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
  approvedAt?: string | null;
  sourceTaskId?: string | null;
}

export type CreateSegmentVideoRecordInput = CreateShotVideoRecordInput;

export function toVideoBatchStorageDir(projectStorageDir: string, batchId: string) {
  return `${projectStorageDir}/${videosDirectoryName}/${videoBatchesDirectoryName}/${batchId}`;
}

export function toVideoBatchManifestRelPath(batchId: string) {
  return `${videosDirectoryName}/${videoBatchesDirectoryName}/${batchId}/${videoManifestFileName}`;
}

export function toVideoCurrentBatchRelPath() {
  return `${videosDirectoryName}/${videoCurrentBatchFileName}`;
}

export function toSegmentVideoStorageDir(batchId: string, segmentStorageKey: string) {
  return `${videosDirectoryName}/${videoBatchesDirectoryName}/${batchId}/${videoSegmentsDirectoryName}/${segmentStorageKey}`;
}

export function toShotVideoStorageKey(input: {
  sceneId: string;
  segmentId: string;
  shotId: string;
}) {
  return `${input.sceneId}__${input.segmentId}__${input.shotId}`;
}

export function toShotVideoStorageDir(
  batchId: string,
  input: {
    sceneId: string;
    segmentId: string;
    shotId: string;
  },
) {
  return `${videosDirectoryName}/${videoBatchesDirectoryName}/${batchId}/${videoShotsDirectoryName}/${toShotVideoStorageKey(input)}`;
}

export function createVideoBatchRecord(input: CreateVideoBatchRecordInput): VideoBatchRecord {
  const shotCount = input.shotCount ?? input.segmentCount ?? 0;

  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    shotCount,
    storageDir: toVideoBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toVideoBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    segmentCount: shotCount,
  };
}

export function createShotVideoRecord(input: CreateShotVideoRecordInput): ShotVideoRecordEntity {
  const storageDir = toShotVideoStorageDir(input.batchId, {
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    shotId: input.shotId,
  });

  return {
    id: input.id,
    projectId: input.projectId,
    batchId: input.batchId,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    shotId: input.shotId,
    shotCode: input.shotCode,
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    segmentOrder: input.segmentOrder,
    shotOrder: input.shotOrder,
    frameDependency: input.frameDependency,
    status: input.status ?? "generating",
    promptTextSeed: input.promptTextSeed ?? "",
    promptTextCurrent: input.promptTextCurrent ?? "",
    promptUpdatedAt: input.promptUpdatedAt ?? input.updatedAt,
    videoAssetPath: input.videoAssetPath ?? null,
    thumbnailAssetPath: input.thumbnailAssetPath ?? null,
    durationSec: input.durationSec ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    updatedAt: input.updatedAt,
    approvedAt: input.approvedAt ?? null,
    sourceTaskId: input.sourceTaskId ?? null,
    projectStorageDir: input.projectStorageDir,
    storageDir: `${input.projectStorageDir}/${storageDir}`,
    currentVideoRelPath: `${storageDir}/${videoCurrentFileName}`,
    currentMetadataRelPath: `${storageDir}/${videoCurrentMetadataFileName}`,
    thumbnailRelPath: `${storageDir}/${videoThumbnailFileName}`,
    versionsStorageDir: `${storageDir}/${videoVersionsDirectoryName}`,
  };
}

export function createSegmentVideoRecord(
  input: CreateSegmentVideoRecordInput,
): SegmentVideoRecordEntity {
  return createShotVideoRecord(input);
}

export function toCurrentVideoBatchSummary(
  batch: Pick<VideoBatchRecord, "id" | "sourceImageBatchId" | "sourceShotScriptId" | "shotCount" | "updatedAt"> & {
    segmentCount?: number;
  },
  shots: Pick<ShotVideoRecord, "status">[],
): CurrentVideoBatchSummary {
  return {
    id: batch.id,
    sourceImageBatchId: batch.sourceImageBatchId,
    sourceShotScriptId: batch.sourceShotScriptId,
    shotCount: batch.shotCount ?? batch.segmentCount ?? 0,
    approvedShotCount: shots.filter((shot) => shot.status === "approved").length,
    updatedAt: batch.updatedAt,
  };
}
