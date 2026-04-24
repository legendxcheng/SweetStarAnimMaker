import type {
  CurrentVideoBatchSummary,
  FinalCutRecord,
  SegmentVideoRecord,
  SegmentVideoReferenceAudio,
  SegmentVideoReferenceImage,
  SegmentVideoStatus,
  ShotFrameDependency,
} from "@sweet-star/shared";

export const videosDirectoryName = "videos";
export const videoBatchesDirectoryName = "batches";
export const videoShotsDirectoryName = "shots";
export const videoSegmentsDirectoryName = "segments";
export const videoReferencesDirectoryName = "references";
export const videoReferenceImagesDirectoryName = "images";
export const videoReferenceAudiosDirectoryName = "audios";
export const videoCurrentBatchFileName = "current-batch.json";
export const videoManifestFileName = "manifest.json";
export const videoCurrentFileName = "current.mp4";
export const videoCurrentMetadataFileName = "current.json";
export const videoThumbnailFileName = "thumbnail.webp";
export const videoVersionsDirectoryName = "versions";
export const videoPromptPlanFileName = "prompt.plan.json";
export const finalCutDirectoryName = "final-cut";
export const finalCutCurrentFileName = "current.mp4";
export const finalCutCurrentMetadataFileName = "current.json";
export const finalCutVersionsDirectoryName = "versions";
export const finalCutManifestsDirectoryName = "manifests";

export interface FinalCutRecordEntity extends FinalCutRecord {
  projectStorageDir: string;
  storageDir: string;
  currentVideoRelPath: string;
  currentMetadataRelPath: string;
  manifestStorageRelPath: string;
  versionsStorageDir: string;
}

export interface CreateFinalCutRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceVideoBatchId: string;
  status: FinalCutRecord["status"];
  videoAssetPath?: string | null;
  manifestAssetPath?: string | null;
  shotCount: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
}

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
  // Deprecated alias while shot-first internals are still being migrated.
  shotCount: number;
}

export interface LegacyShotVideoFields {
  shotId: string;
  shotCode: string;
  shotOrder: number;
  frameDependency: ShotFrameDependency;
}

export interface SegmentVideoRecordEntity extends SegmentVideoRecord, LegacyShotVideoFields {
  projectStorageDir: string;
  storageDir: string;
  currentVideoRelPath: string;
  currentMetadataRelPath: string;
  thumbnailRelPath: string;
  versionsStorageDir: string;
}

export type ShotVideoRecordEntity = SegmentVideoRecordEntity;

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

export interface CreateSegmentVideoRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  segmentName?: string | null;
  segmentSummary: string;
  shotCount: number;
  sourceShotIds: string[];
  status?: SegmentVideoStatus;
  promptTextSeed?: string;
  promptTextCurrent?: string;
  promptUpdatedAt?: string;
  referenceImages?: SegmentVideoReferenceImage[];
  referenceAudios?: SegmentVideoReferenceAudio[];
  videoAssetPath?: string | null;
  thumbnailAssetPath?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
  approvedAt?: string | null;
  sourceTaskId?: string | null;
  // Deprecated legacy fields kept until downstream use cases are migrated.
  shotId?: string;
  shotCode?: string;
  shotOrder?: number;
  frameDependency?: ShotFrameDependency;
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
  status?: SegmentVideoStatus;
  promptTextSeed?: string;
  promptTextCurrent?: string;
  promptUpdatedAt?: string;
  referenceImages?: SegmentVideoReferenceImage[];
  referenceAudios?: SegmentVideoReferenceAudio[];
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

export function toSegmentVideoStorageKey(input: {
  sceneId: string;
  segmentId: string;
}) {
  return `${input.sceneId}__${input.segmentId}`;
}

export function toSegmentVideoStorageDir(
  batchId: string,
  input: {
    sceneId: string;
    segmentId: string;
  },
) {
  return `${videosDirectoryName}/${videoBatchesDirectoryName}/${batchId}/${videoSegmentsDirectoryName}/${toSegmentVideoStorageKey(input)}`;
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
  const segmentCount = input.segmentCount ?? input.shotCount ?? 0;

  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    segmentCount,
    storageDir: toVideoBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toVideoBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    shotCount: segmentCount,
  };
}

export function createSegmentVideoRecord(
  input: CreateSegmentVideoRecordInput,
): SegmentVideoRecordEntity {
  const storageDir = toSegmentVideoStorageDir(input.batchId, {
    sceneId: input.sceneId,
    segmentId: input.segmentId,
  });

  return {
    id: input.id,
    projectId: input.projectId,
    batchId: input.batchId,
    sourceImageBatchId: input.sourceImageBatchId,
    sourceShotScriptId: input.sourceShotScriptId,
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    segmentOrder: input.segmentOrder,
    segmentName: input.segmentName ?? null,
    segmentSummary: input.segmentSummary,
    shotCount: input.shotCount,
    sourceShotIds: input.sourceShotIds,
    status: input.status ?? "generating",
    promptTextSeed: input.promptTextSeed ?? "",
    promptTextCurrent: input.promptTextCurrent ?? "",
    promptUpdatedAt: input.promptUpdatedAt ?? input.updatedAt,
    referenceImages: input.referenceImages ?? [],
    referenceAudios: input.referenceAudios ?? [],
    videoAssetPath: input.videoAssetPath ?? null,
    thumbnailAssetPath: input.thumbnailAssetPath ?? null,
    durationSec: input.durationSec ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    updatedAt: input.updatedAt,
    approvedAt: input.approvedAt ?? null,
    sourceTaskId: input.sourceTaskId ?? null,
    shotId: input.shotId ?? input.sourceShotIds[0] ?? input.segmentId,
    shotCode: input.shotCode ?? input.sourceShotIds[0] ?? input.segmentId,
    shotOrder: input.shotOrder ?? 1,
    frameDependency: input.frameDependency ?? "start_frame_only",
    projectStorageDir: input.projectStorageDir,
    storageDir: `${input.projectStorageDir}/${storageDir}`,
    currentVideoRelPath: `${storageDir}/${videoCurrentFileName}`,
    currentMetadataRelPath: `${storageDir}/${videoCurrentMetadataFileName}`,
    thumbnailRelPath: `${storageDir}/${videoThumbnailFileName}`,
    versionsStorageDir: `${storageDir}/${videoVersionsDirectoryName}`,
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
    sceneId: input.sceneId,
    segmentId: input.segmentId,
    segmentOrder: input.segmentOrder,
    segmentName: null,
    segmentSummary: input.shotCode,
    shotCount: 1,
    sourceShotIds: [input.shotId],
    status: input.status ?? "generating",
    promptTextSeed: input.promptTextSeed ?? "",
    promptTextCurrent: input.promptTextCurrent ?? "",
    promptUpdatedAt: input.promptUpdatedAt ?? input.updatedAt,
    referenceImages: input.referenceImages ?? [],
    referenceAudios: input.referenceAudios ?? [],
    videoAssetPath: input.videoAssetPath ?? null,
    thumbnailAssetPath: input.thumbnailAssetPath ?? null,
    durationSec: input.durationSec ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    updatedAt: input.updatedAt,
    approvedAt: input.approvedAt ?? null,
    sourceTaskId: input.sourceTaskId ?? null,
    shotId: input.shotId,
    shotCode: input.shotCode,
    shotOrder: input.shotOrder,
    frameDependency: input.frameDependency,
    projectStorageDir: input.projectStorageDir,
    storageDir: `${input.projectStorageDir}/${storageDir}`,
    currentVideoRelPath: `${storageDir}/${videoCurrentFileName}`,
    currentMetadataRelPath: `${storageDir}/${videoCurrentMetadataFileName}`,
    thumbnailRelPath: `${storageDir}/${videoThumbnailFileName}`,
    versionsStorageDir: `${storageDir}/${videoVersionsDirectoryName}`,
  };
}

export function toFinalCutStorageDir(projectStorageDir: string) {
  return `${projectStorageDir}/${finalCutDirectoryName}`;
}

export function createFinalCutRecord(input: CreateFinalCutRecordInput): FinalCutRecordEntity {
  const storageDir = toFinalCutStorageDir(input.projectStorageDir);
  const versionsStorageDir = `${finalCutDirectoryName}/${finalCutVersionsDirectoryName}`;
  const manifestAssetPath =
    input.manifestAssetPath ??
    `${finalCutDirectoryName}/${finalCutManifestsDirectoryName}/${input.id}.txt`;

  return {
    id: input.id,
    projectId: input.projectId,
    sourceVideoBatchId: input.sourceVideoBatchId,
    status: input.status,
    videoAssetPath:
      input.videoAssetPath === undefined
        ? `${finalCutDirectoryName}/${finalCutCurrentFileName}`
        : input.videoAssetPath,
    manifestAssetPath,
    shotCount: input.shotCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    errorMessage: input.errorMessage ?? null,
    projectStorageDir: input.projectStorageDir,
    storageDir,
    currentVideoRelPath: `${finalCutDirectoryName}/${finalCutCurrentFileName}`,
    currentMetadataRelPath: `${finalCutDirectoryName}/${finalCutCurrentMetadataFileName}`,
    manifestStorageRelPath: manifestAssetPath,
    versionsStorageDir,
  };
}

export function toCurrentVideoBatchSummary(
  batch: Pick<VideoBatchRecord, "id" | "sourceImageBatchId" | "sourceShotScriptId" | "updatedAt"> & {
    segmentCount?: number;
    shotCount?: number;
  },
  segments: Pick<SegmentVideoRecordEntity, "status">[],
): CurrentVideoBatchSummary {
  return {
    id: batch.id,
    sourceImageBatchId: batch.sourceImageBatchId,
    sourceShotScriptId: batch.sourceShotScriptId,
    segmentCount: batch.segmentCount ?? batch.shotCount ?? 0,
    approvedSegmentCount: segments.filter((segment) => segment.status === "approved").length,
    updatedAt: batch.updatedAt,
  };
}

export function toPublicSegmentVideoRecord(
  segment: SegmentVideoRecord &
    Partial<
      Pick<
        SegmentVideoRecordEntity,
        | "projectStorageDir"
        | "storageDir"
        | "currentVideoRelPath"
        | "currentMetadataRelPath"
        | "thumbnailRelPath"
        | "versionsStorageDir"
        | "shotId"
        | "shotCode"
        | "shotOrder"
        | "frameDependency"
      >
    >,
): SegmentVideoRecord {
  return {
    id: segment.id,
    projectId: segment.projectId,
    batchId: segment.batchId,
    sourceImageBatchId: segment.sourceImageBatchId,
    sourceShotScriptId: segment.sourceShotScriptId,
    sceneId: segment.sceneId,
    segmentId: segment.segmentId,
    segmentOrder: segment.segmentOrder,
    segmentName: segment.segmentName,
    segmentSummary: segment.segmentSummary,
    shotCount: segment.shotCount,
    sourceShotIds: segment.sourceShotIds,
    status: segment.status,
    promptTextSeed: segment.promptTextSeed,
    promptTextCurrent: segment.promptTextCurrent,
    promptUpdatedAt: segment.promptUpdatedAt,
    referenceImages: segment.referenceImages,
    referenceAudios: segment.referenceAudios,
    videoAssetPath: segment.videoAssetPath,
    thumbnailAssetPath: segment.thumbnailAssetPath,
    durationSec: segment.durationSec,
    provider: segment.provider,
    model: segment.model,
    updatedAt: segment.updatedAt,
    approvedAt: segment.approvedAt,
    sourceTaskId: segment.sourceTaskId,
  };
}
