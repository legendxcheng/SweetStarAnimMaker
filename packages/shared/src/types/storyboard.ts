import type { StoryboardVersionKind } from "../constants/storyboard-version-kind";

export interface StoryboardSegment {
  id: string;
  order: number;
  durationSec: number | null;
  visual: string;
  characterAction: string;
  dialogue: string;
  voiceOver: string;
  audio: string;
  purpose: string;
}

export interface StoryboardScene {
  id: string;
  order: number;
  name: string;
  dramaticPurpose: string;
  segments: StoryboardSegment[];
}

export interface CurrentStoryboardSummary {
  id: string;
  title: string | null;
  episodeTitle: string | null;
  sourceMasterPlotId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sceneCount: number;
  segmentCount: number;
  totalDurationSec: number | null;
}

export interface CurrentStoryboard {
  id: string;
  title: string | null;
  episodeTitle: string | null;
  sourceMasterPlotId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  scenes: StoryboardScene[];
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
