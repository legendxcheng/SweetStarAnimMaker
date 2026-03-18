import type { ProjectSummary } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";
import { toStoryboardVersionSummary, type StoryboardVersionRecord } from "../domain/storyboard";

export function toProjectSummaryDto(
  project: ProjectRecord,
  currentStoryboard: StoryboardVersionRecord | null,
): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    status: project.status,
    storageDir: project.storageDir,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    currentStoryboard: currentStoryboard ? toStoryboardVersionSummary(currentStoryboard) : null,
  };
}
