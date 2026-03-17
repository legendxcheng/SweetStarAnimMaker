import type { StoryboardVersionKind } from "../constants/storyboard-version-kind";

export interface StoryboardScene {
  id: string;
  sceneIndex: number;
  description: string;
  camera: string;
  characters: string[];
  prompt: string;
}

export interface StoryboardVersionSummary {
  id: string;
  projectId: string;
  versionNumber: number;
  kind: StoryboardVersionKind;
  provider: string;
  model: string;
  filePath: string;
  createdAt: string;
  sourceTaskId: string;
}

export interface CurrentStoryboard extends StoryboardVersionSummary {
  summary: string;
  scenes: StoryboardScene[];
}
