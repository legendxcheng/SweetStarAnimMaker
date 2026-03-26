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
  shotCount: number;
  totalRequiredFrameCount: number;
  approvedShotCount: number;
  updatedAt: string;
}

export type ShotReferenceStatus = "pending" | "in_review" | "approved" | "failed";

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

interface ShotReferenceRecordBase {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  referenceStatus: ShotReferenceStatus;
  startFrame: ShotReferenceFrame;
  updatedAt: string;
}

export interface StartFrameOnlyShotReferenceRecord extends ShotReferenceRecordBase {
  frameDependency: "start_frame_only";
  endFrame: null;
}

export interface StartAndEndShotReferenceRecord extends ShotReferenceRecordBase {
  frameDependency: "start_and_end_frame";
  endFrame: ShotReferenceFrame;
}

export type ShotReferenceRecord =
  | StartFrameOnlyShotReferenceRecord
  | StartAndEndShotReferenceRecord;

export type SegmentFrameRecord = ShotReferenceFrame;
export interface ImageFrameListResponse {
  currentBatch: CurrentImageBatch;
  shots: ShotReferenceRecord[];
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
