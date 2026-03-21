import type {
  CurrentCharacterSheetBatchSummary,
  CurrentMasterPlot,
  CurrentStoryboardSummary,
  ProjectDetail,
} from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export function toProjectDetailDto(
  project: ProjectRecord,
  currentMasterPlot: CurrentMasterPlot | null,
  currentCharacterSheetBatch: CurrentCharacterSheetBatchSummary | null = null,
  currentStoryboard: CurrentStoryboardSummary | null = null,
): ProjectDetail {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    status: project.status,
    storageDir: project.storageDir,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    premise: {
      path: project.premiseRelPath,
      bytes: project.premiseBytes,
      updatedAt: project.premiseUpdatedAt,
    },
    currentMasterPlot,
    currentCharacterSheetBatch,
    currentStoryboard,
  };
}
