import type { ProjectStatus } from "../constants/project-status";
import type { StoryboardReviewAction } from "../constants/storyboard-review-action";
import type { StoryboardReviewNextAction } from "../constants/storyboard-review-next-action";
import type { CurrentStoryboard, StoryboardScene } from "./storyboard";
import type { TaskDetail } from "./task-detail";

export interface StoryboardReviewRecord {
  id: string;
  projectId: string;
  storyboardVersionId: string;
  action: StoryboardReviewAction;
  reason: string | null;
  triggeredTaskId: string | null;
  createdAt: string;
}

export interface StoryboardReviewSummary extends StoryboardReviewRecord {}

export interface StoryboardReviewAvailableActions {
  saveHumanVersion: boolean;
  approve: boolean;
  reject: boolean;
}

export interface StoryboardReviewWorkspace {
  projectId: string;
  projectStatus: ProjectStatus;
  currentStoryboard: CurrentStoryboard;
  latestReview: StoryboardReviewSummary | null;
  availableActions: StoryboardReviewAvailableActions;
  latestStoryboardTask: TaskDetail | null;
}

export interface ApproveStoryboardRequest {
  storyboardVersionId: string;
  note?: string;
}

export interface RejectStoryboardRequest {
  storyboardVersionId: string;
  reason: string;
  nextAction: StoryboardReviewNextAction;
}

export interface SaveHumanStoryboardVersionRequest {
  baseVersionId: string;
  summary: string;
  scenes: StoryboardScene[];
}
