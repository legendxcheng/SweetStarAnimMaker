import type { ProjectStatus } from "../constants/project-status";
import type { CurrentCharacterSheetBatchSummary } from "./character-sheet";
import type { CurrentMasterPlot } from "./master-plot";
import type { CurrentSceneSheetBatchSummary } from "./scene-sheet";
import type { CurrentImageBatch } from "./shot-image";
import type { CurrentShotScriptSummary } from "./shot-script";
import type { CurrentStoryboardSummary } from "./storyboard";
import type { CurrentVideoBatchSummary } from "./video";

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
  currentSceneSheetBatch: CurrentSceneSheetBatchSummary | null;
  currentStoryboard: CurrentStoryboardSummary | null;
  currentShotScript: CurrentShotScriptSummary | null;
  currentImageBatch: CurrentImageBatch | null;
  currentVideoBatch: CurrentVideoBatchSummary | null;
}
