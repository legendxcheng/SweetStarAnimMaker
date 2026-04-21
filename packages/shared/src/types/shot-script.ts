export type ShotScriptSegmentStatus =
  | "pending"
  | "generating"
  | "in_review"
  | "approved"
  | "failed";

export type ShotFrameDependency = "start_frame_only" | "start_and_end_frame";

export interface ShotScriptItem {
  id: string;
  sceneId: string;
  segmentId: string;
  order: number;
  shotCode: string;
  durationSec: number | null;
  purpose: string;
  visual: string;
  subject: string;
  action: string;
  frameDependency: ShotFrameDependency;
  dialogue: string | null;
  os: string | null;
  audio: string | null;
  transitionHint: string | null;
  continuityNotes: string | null;
}

export interface ShotScriptSegment {
  segmentId: string;
  sceneId: string;
  order: number;
  name: string | null;
  summary: string;
  durationSec: number | null;
  status: ShotScriptSegmentStatus;
  lastGeneratedAt: string | null;
  approvedAt: string | null;
  lastErrorMessage?: string | null;
  shots: ShotScriptItem[];
}

export interface CurrentShotScriptSummary {
  id: string;
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  segmentCount: number;
  shotCount: number;
  totalDurationSec: number | null;
}

export interface CurrentShotScript extends CurrentShotScriptSummary {
  segments: ShotScriptSegment[];
}
