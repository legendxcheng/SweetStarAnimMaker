import type { ProjectStatus } from "../constants/project-status";
import type { CurrentMasterPlot } from "./master-plot";
import type { TaskDetail } from "./task-detail";

export interface MasterPlotReviewSummary {
  id: string;
  projectId: string;
  masterPlotId: string;
  action: "approve" | "reject";
  reason: string | null;
  triggeredTaskId: string | null;
  createdAt: string;
}

export interface MasterPlotReviewAvailableActions {
  save: boolean;
  approve: boolean;
  reject: boolean;
}

export interface MasterPlotReviewWorkspace {
  projectId: string;
  projectStatus: ProjectStatus;
  currentMasterPlot: CurrentMasterPlot;
  latestReview: MasterPlotReviewSummary | null;
  availableActions: MasterPlotReviewAvailableActions;
  latestTask: TaskDetail | null;
}

export interface ApproveMasterPlotRequest {}

export interface RejectMasterPlotRequest {
  reason: string;
}

export interface SaveMasterPlotRequest {
  title: string | null;
  logline: string;
  synopsis: string;
  mainCharacters: string[];
  coreConflict: string;
  emotionalArc: string;
  endingBeat: string;
  targetDurationSec: number | null;
}
