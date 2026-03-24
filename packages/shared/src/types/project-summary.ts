import type { ProjectStatus } from "../constants/project-status";
import type { CurrentCharacterSheetBatchSummary } from "./character-sheet";
import type { CurrentMasterPlot } from "./master-plot";
import type { CurrentImageBatch } from "./shot-image";
import type { CurrentShotScriptSummary } from "./shot-script";
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
  currentCharacterSheetBatch: CurrentCharacterSheetBatchSummary | null;
  currentStoryboard: CurrentStoryboardSummary | null;
  currentShotScript: CurrentShotScriptSummary | null;
  currentImageBatch: CurrentImageBatch | null;
}
