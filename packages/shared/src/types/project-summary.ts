import type { ProjectStatus } from "../constants/project-status";
import type { StoryboardVersionSummary } from "./storyboard";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  storageDir: string;
  createdAt: string;
  updatedAt: string;
  currentStoryboard: StoryboardVersionSummary | null;
}
