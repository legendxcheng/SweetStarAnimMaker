import type { ProjectStatus } from "../constants/project-status";
import type { StoryboardVersionSummary } from "./storyboard";

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
  currentStoryboard: StoryboardVersionSummary | null;
}
