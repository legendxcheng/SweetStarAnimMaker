import type { ProjectStatus } from "../constants/project-status";
import type { StoryboardReviewAction } from "../constants/storyboard-review-action";
import type { StoryboardReviewNextAction } from "../constants/storyboard-review-next-action";
import type { CurrentShotScript } from "./shot-script";
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
  save: boolean;
  approve: boolean;
  reject: boolean;
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

export interface SaveShotScriptRequest {
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  shots: CurrentShotScript["shots"];
}

export interface ApproveShotScriptRequest {}

export interface RejectShotScriptRequest {
  reason: string;
  nextAction: StoryboardReviewNextAction;
}
