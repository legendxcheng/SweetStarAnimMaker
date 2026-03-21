import type { ProjectStatus } from "../constants/project-status";
import type { CurrentCharacterSheetBatchSummary } from "./character-sheet";
import type { CurrentMasterPlot } from "./master-plot";
import type { CurrentStoryboardSummary } from "./storyboard";

export interface ProjectPremiseMetadata {
  path: string;
  bytes: number;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  storageDir: string;
  createdAt: string;
  updatedAt: string;
  premise: ProjectPremiseMetadata;
  currentMasterPlot: CurrentMasterPlot | null;
  currentCharacterSheetBatch: CurrentCharacterSheetBatchSummary | null;
  currentStoryboard: CurrentStoryboardSummary | null;
}
