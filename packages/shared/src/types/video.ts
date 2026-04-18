export type SegmentVideoStatus = "generating" | "in_review" | "approved" | "failed";
export type FinalCutStatus = "generating" | "ready" | "failed";

export interface CurrentVideoBatchSummary {
  id: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
}

export interface SegmentVideoReferenceImage {
  id: string;
  assetPath: string;
  source: "auto" | "manual";
  order: number;
  sourceShotId?: string | null;
  label?: string | null;
}

export interface SegmentVideoReferenceAudio {
  id: string;
  assetPath: string;
  source: "manual";
  order: number;
  label?: string | null;
  durationSec?: number | null;
}

export interface SegmentVideoRecord {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  segmentName: string | null;
  segmentSummary: string;
  shotCount: number;
  sourceShotIds: string[];
  status: SegmentVideoStatus;
  promptTextSeed: string;
  promptTextCurrent: string;
  promptUpdatedAt: string;
  referenceImages: SegmentVideoReferenceImage[];
  referenceAudios: SegmentVideoReferenceAudio[];
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
}

export type ShotVideoStatus = SegmentVideoStatus;
export type ShotVideoRecord = SegmentVideoRecord;

export interface FinalCutRecord {
  id: string;
  projectId: string;
  sourceVideoBatchId: string;
  status: FinalCutStatus;
  videoAssetPath: string | null;
  manifestAssetPath: string | null;
  shotCount: number;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
}

export interface FinalCutResponse {
  currentFinalCut: FinalCutRecord | null;
}

export interface VideoListResponse {
  currentBatch: CurrentVideoBatchSummary;
  segments: SegmentVideoRecord[];
}

export interface ApproveVideoSegmentRequest {}

export interface SaveSegmentVideoConfigRequest {
  promptTextCurrent: string;
  referenceImages: SegmentVideoReferenceImage[];
  referenceAudios: SegmentVideoReferenceAudio[];
}

export type SaveVideoPromptRequest = SaveSegmentVideoConfigRequest;

export interface ReferenceAudioUploadMetadataRequest {
  fileName: string;
  mimeType: string;
  bytes: number;
  label?: string | null;
  durationSec?: number | null;
}

export interface RegenerateVideoPromptRequest {}

export interface RegenerateVideoSegmentRequest {}

export interface RegenerateAllVideoPromptsRequest {}

export interface ApproveAllVideoSegmentsRequest {}

export interface GenerateFinalCutRequest {}
