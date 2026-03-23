import type { ProjectStatus } from "../constants/project-status";
import type { StoryboardReviewAction } from "../constants/storyboard-review-action";
import type { StoryboardReviewNextAction } from "../constants/storyboard-review-next-action";
import type { CurrentShotScript, ShotScriptItem } from "./shot-script";
import type { TaskDetail } from "./task-detail";

export interface ShotScriptReviewSummary {
  id: string;
  projectId: string;
  shotScriptId: string;
  action: StoryboardReviewAction;
  reason: string | null;
  nextAction: StoryboardReviewNextAction | null;
  triggeredTaskId: string | null;
  createdAt: string;
}

export interface ShotScriptReviewAvailableActions {
  saveSegment: boolean;
  regenerateSegment: boolean;
  approveSegment: boolean;
  approveAll: boolean;
}

export interface ShotScriptReviewWorkspace {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  currentShotScript: CurrentShotScript;
  latestReview: ShotScriptReviewSummary | null;
  latestTask: TaskDetail | null;
  availableActions: ShotScriptReviewAvailableActions;
}

export interface SaveShotScriptSegmentRequest {
  name: string | null;
  summary: string;
  durationSec: number | null;
  shots: ShotScriptItem[];
}

export interface RegenerateShotScriptSegmentRequest {}

export interface ApproveShotScriptSegmentRequest {}

export interface ApproveAllShotScriptSegmentsRequest {}
