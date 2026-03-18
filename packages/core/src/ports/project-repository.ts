import type { ProjectStatus } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export interface UpdateProjectScriptMetadataInput {
  id: string;
  scriptBytes: number;
  updatedAt: string;
  scriptUpdatedAt: string;
}

export interface UpdateCurrentStoryboardVersionInput {
  projectId: string;
  storyboardVersionId: string | null;
}

export interface UpdateProjectStatusInput {
  projectId: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface ProjectRepository {
  insert(project: ProjectRecord): Promise<void> | void;
  findById(projectId: string): Promise<ProjectRecord | null> | ProjectRecord | null;
  updateScriptMetadata(
    input: UpdateProjectScriptMetadataInput,
  ): Promise<void> | void;
  updateCurrentStoryboardVersion(
    input: UpdateCurrentStoryboardVersionInput,
  ): Promise<void> | void;
  updateStatus(input: UpdateProjectStatusInput): Promise<void> | void;
}
