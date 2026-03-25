export type SegmentVideoStatus = "generating" | "in_review" | "approved" | "failed";

export interface CurrentVideoBatchSummary {
  id: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
}

export interface SegmentVideoRecord {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  status: SegmentVideoStatus;
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
}

export interface VideoListResponse {
  currentBatch: CurrentVideoBatchSummary;
  segments: SegmentVideoRecord[];
}

export interface ApproveVideoSegmentRequest {}

export interface RegenerateVideoSegmentRequest {}

export interface ApproveAllVideoSegmentsRequest {}
