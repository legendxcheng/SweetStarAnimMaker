import type { ProjectDetail } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";
import { toStoryboardVersionSummary, type StoryboardVersionRecord } from "../domain/storyboard";

export function toProjectDetailDto(
  project: ProjectRecord,
  currentStoryboard: StoryboardVersionRecord | null,
): ProjectDetail {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    status: project.status,
    storageDir: project.storageDir,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    script: {
      path: project.scriptRelPath,
      bytes: project.scriptBytes,
      updatedAt: project.scriptUpdatedAt,
    },
    currentStoryboard: currentStoryboard ? toStoryboardVersionSummary(currentStoryboard) : null,
  };
}
