import type { ProjectStatus } from "../constants/project-status";
import type { CurrentMasterPlot } from "./master-plot";
import type { CurrentStoryboardSummary } from "./storyboard";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  storageDir: string;
  createdAt: string;
  updatedAt: string;
  currentMasterPlot: CurrentMasterPlot | null;
  currentStoryboard: CurrentStoryboardSummary | null;
}
