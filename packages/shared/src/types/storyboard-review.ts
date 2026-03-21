import type { ProjectStatus } from "../constants/project-status";
import type { CurrentStoryboard } from "./storyboard";
import type { TaskDetail } from "./task-detail";

export interface StoryboardReviewAvailableActions {
  save: boolean;
  approve: boolean;
  reject: boolean;
}

export interface StoryboardReviewWorkspace {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  currentStoryboard: CurrentStoryboard;
  latestTask: TaskDetail | null;
  availableActions: StoryboardReviewAvailableActions;
}

export interface SaveStoryboardRequest {
  title: string | null;
  episodeTitle: string | null;
  sourceMasterPlotId: string;
  sourceTaskId: string | null;
  scenes: CurrentStoryboard["scenes"];
}

export interface ApproveStoryboardRequest {}

export interface RejectStoryboardRequest {}
