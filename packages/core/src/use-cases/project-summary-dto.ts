import type {
  CurrentCharacterSheetBatchSummary,
  CurrentImageBatch,
  CurrentMasterPlot,
  CurrentShotScriptSummary,
  CurrentStoryboardSummary,
  CurrentVideoBatchSummary,
  ProjectSummary,
} from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export function toProjectSummaryDto(
  project: ProjectRecord,
  currentMasterPlot: CurrentMasterPlot | null,
  currentCharacterSheetBatch: CurrentCharacterSheetBatchSummary | null = null,
  currentStoryboard: CurrentStoryboardSummary | null = null,
  currentShotScript: CurrentShotScriptSummary | null = null,
  currentImageBatch: CurrentImageBatch | null = null,
  currentVideoBatch: CurrentVideoBatchSummary | null = null,
): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    status: project.status,
    storageDir: project.storageDir,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    currentMasterPlot,
    currentCharacterSheetBatch,
    currentStoryboard,
    currentShotScript,
    currentImageBatch,
    currentVideoBatch,
  };
}
