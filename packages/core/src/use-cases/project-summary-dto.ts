import type { CurrentMasterPlot, ProjectSummary } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export function toProjectSummaryDto(
  project: ProjectRecord,
  currentMasterPlot: CurrentMasterPlot | null,
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
  };
}
