import type { ShotFrameDependency } from "./shot-script";

export type ShotVideoStatus = "generating" | "in_review" | "approved" | "failed";
export type FinalCutStatus = "generating" | "ready" | "failed";

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
  segmentId: string;
  segmentOrder: number;
  shotOrder: number;
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

export interface GenerateFinalCutRequest {}
