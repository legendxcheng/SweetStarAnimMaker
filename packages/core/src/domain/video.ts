import type {
  CurrentVideoBatchSummary,
  SegmentVideoRecord,
  SegmentVideoStatus,
} from "@sweet-star/shared";
import { toShotScriptSegmentStorageKey } from "@sweet-star/shared";

export const videosDirectoryName = "videos";
export const videoBatchesDirectoryName = "batches";
export const videoSegmentsDirectoryName = "segments";
export const videoCurrentBatchFileName = "current-batch.json";
export const videoManifestFileName = "manifest.json";
export const videoCurrentFileName = "current.mp4";
export const videoCurrentMetadataFileName = "current.json";
export const videoThumbnailFileName = "thumbnail.webp";
export const videoVersionsDirectoryName = "versions";

export interface VideoBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentCount: number;
  storageDir: string;
  manifestRelPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentVideoRecordEntity extends SegmentVideoRecord {
  projectStorageDir: string;
  storageDir: string;
  currentVideoRelPath: string;
  currentMetadataRelPath: string;
  thumbnailRelPath: string;
  versionsStorageDir: string;
}

export interface CreateVideoBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentVideoRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  status?: SegmentVideoStatus;
  videoAssetPath?: string | null;
  thumbnailAssetPath?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
  approvedAt?: string | null;
  sourceTaskId?: string | null;
}

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

export function createVideoBatchRecord(input: CreateVideoBatchRecordInput): VideoBatchRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentCount: input.segmentCount,
    storageDir: toVideoBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toVideoBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function createSegmentVideoRecord(
  input: CreateSegmentVideoRecordInput,
): SegmentVideoRecordEntity {
  const segmentStorageKey = toShotScriptSegmentStorageKey({
    sceneId: input.sceneId,
    segmentId: input.segmentId,
  });
  const storageDir = toSegmentVideoStorageDir(input.batchId, segmentStorageKey);

  return {
    id: input.id,
    projectId: input.projectId,
    batchId: input.batchId,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentId: input.segmentId,
    sceneId: input.sceneId,
    order: input.order,
    status: input.status ?? "generating",
    videoAssetPath: input.videoAssetPath ?? `${storageDir}/${videoCurrentFileName}`,
    thumbnailAssetPath: input.thumbnailAssetPath ?? `${storageDir}/${videoThumbnailFileName}`,
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

export function toCurrentVideoBatchSummary(
  batch: Pick<VideoBatchRecord, "id" | "sourceImageBatchId" | "sourceShotScriptId" | "segmentCount" | "updatedAt">,
  segments: Pick<SegmentVideoRecord, "status">[],
): CurrentVideoBatchSummary {
  return {
    id: batch.id,
    sourceImageBatchId: batch.sourceImageBatchId,
    sourceShotScriptId: batch.sourceShotScriptId,
    segmentCount: batch.segmentCount,
    approvedSegmentCount: segments.filter((segment) => segment.status === "approved").length,
    updatedAt: batch.updatedAt,
  };
}
