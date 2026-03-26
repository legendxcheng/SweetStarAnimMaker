import type { ShotFrameDependency } from "./shot-script";

export type ShotVideoStatus = "generating" | "in_review" | "approved" | "failed";

export interface CurrentVideoBatchSummary {
  id: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotCount: number;
  approvedShotCount: number;
  updatedAt: string;
}

export interface ShotVideoRecord {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  sceneId: string;
  frameDependency: ShotFrameDependency;
  status: ShotVideoStatus;
  promptTextSeed: string;
  promptTextCurrent: string;
  promptUpdatedAt: string;
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
}

export type SegmentVideoRecord = ShotVideoRecord;

export interface VideoListResponse {
  currentBatch: CurrentVideoBatchSummary;
  shots: ShotVideoRecord[];
}

export interface ApproveVideoSegmentRequest {}

export interface SaveVideoPromptRequest {
  promptTextCurrent: string;
}

export interface RegenerateVideoPromptRequest {}

export interface RegenerateVideoSegmentRequest {}

export interface RegenerateAllVideoPromptsRequest {}

export interface ApproveAllVideoSegmentsRequest {}
