export type ImageFrameType = "start_frame" | "end_frame";

export type ImageFramePlanStatus = "pending" | "planned" | "plan_failed";

export type ImageFrameStatus =
  | "pending"
  | "generating"
  | "in_review"
  | "approved"
  | "failed";

export interface CurrentImageBatch {
  id: string;
  sourceShotScriptId: string;
  segmentCount: number;
  totalRequiredFrameCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
  shotCount?: number;
  approvedShotCount?: number;
}

export type SegmentImageStatus = "pending" | "in_review" | "approved" | "failed";
export type ShotReferenceStatus = SegmentImageStatus;

export interface ShotReferenceFrame {
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

interface SegmentImageRecordBase {
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
  startFrame: ShotReferenceFrame;
  approvedAt: string | null;
  updatedAt: string;
  shotId?: string;
  shotCode?: string;
  shotOrder?: number;
  referenceStatus?: ShotReferenceStatus;
}

export interface StartFrameOnlySegmentImageRecord extends SegmentImageRecordBase {
  frameDependency: "start_frame_only";
  endFrame: null;
}

export interface StartAndEndSegmentImageRecord extends SegmentImageRecordBase {
  frameDependency: "start_and_end_frame";
  endFrame: ShotReferenceFrame;
}

export type SegmentImageRecord =
  | StartFrameOnlySegmentImageRecord
  | StartAndEndSegmentImageRecord;
export type ShotReferenceRecord = SegmentImageRecord;

export type SegmentFrameRecord = ShotReferenceFrame;
export interface ImageFrameListResponse {
  currentBatch: CurrentImageBatch;
  segments: SegmentImageRecord[];
  shots?: ShotReferenceRecord[];
}

export interface RegenerateAllImagePromptsResponse {
  batchId: string;
  frameCount: number;
  taskIds: string[];
}

export interface UpdateImageFramePromptRequest {
  promptTextCurrent: string;
  negativePromptTextCurrent: string | null;
}

export interface RegenerateImageFramePromptRequest {}

export interface GenerateImageFrameRequest {}

export interface ApproveImageFrameRequest {}

export interface ApproveAllImageFramesRequest {}
