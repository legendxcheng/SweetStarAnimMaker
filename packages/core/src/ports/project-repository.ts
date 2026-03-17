import type { ProjectRecord } from "../domain/project";

export interface UpdateProjectScriptMetadataInput {
  id: string;
  scriptBytes: number;
  updatedAt: string;
  scriptUpdatedAt: string;
}

export interface ProjectRepository {
  insert(project: ProjectRecord): Promise<void> | void;
  findById(projectId: string): Promise<ProjectRecord | null> | ProjectRecord | null;
  updateScriptMetadata(
    input: UpdateProjectScriptMetadataInput,
  ): Promise<void> | void;
}
