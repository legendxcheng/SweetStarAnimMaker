import type { ProjectDetail } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export function toProjectDetailDto(project: ProjectRecord): ProjectDetail {
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
  };
}
