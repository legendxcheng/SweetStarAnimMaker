import type {
  ImageFramePlanStatus,
  ImageFrameStatus,
  ImageFrameType,
  SegmentImageRecord,
  SegmentImageStatus,
  ShotFrameDependency,
  ShotReferenceFrame,
  ShotReferenceStatus,
} from "@sweet-star/shared";

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
  segmentOrder: number;
  segmentName: string | null;
  segmentSummary: string;
  sourceShotIds: string[];
  status: SegmentImageStatus;
  approvedAt: string | null;
  projectStorageDir: string;
  storageDir: string;
  manifestRelPath: string;
  startFrame: ShotReferenceFrameEntity;
  updatedAt: string;
  shotId?: string;
  shotCode?: string;
  shotOrder?: number;
  durationSec?: number | null;
  referenceStatus?: ShotReferenceStatus;
}

export type StartFrameOnlySegmentImageRecordEntity = ShotReferenceRecordEntityBase & {
  frameDependency: "start_frame_only";
  endFrame: null;
};

export type StartAndEndSegmentImageRecordEntity = ShotReferenceRecordEntityBase & {
  frameDependency: "start_and_end_frame";
  endFrame: ShotReferenceFrameEntity;
};

export type SegmentImageRecordEntity =
  | StartFrameOnlySegmentImageRecordEntity
  | StartAndEndSegmentImageRecordEntity;
export type ShotReferenceRecordEntity = SegmentImageRecordEntity;

export interface CreateShotReferenceRecordInput {
  id: string;
  batchId: string;
  projectId: string;
  projectStorageDir: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  segmentName: string | null;
  segmentSummary: string;
  sourceShotIds: string[];
  frameDependency: ShotFrameDependency;
  status?: SegmentImageStatus;
  approvedAt?: string | null;
  shotId?: string;
  shotCode?: string;
  shotOrder?: number;
  durationSec?: number | null;
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
  selectedSceneId: string | null;
  selectedSceneName: string | null;
  selectedSceneImageAssetPath?: string | null;
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
  selectedSceneId?: string | null;
  selectedSceneName?: string | null;
  selectedSceneImageAssetPath?: string | null;
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
