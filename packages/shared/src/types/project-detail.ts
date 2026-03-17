import type { ProjectStatus } from "../constants/project-status";

export interface ProjectScriptMetadata {
  path: string;
  bytes: number;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  storageDir: string;
  createdAt: string;
  updatedAt: string;
  script: ProjectScriptMetadata;
}
