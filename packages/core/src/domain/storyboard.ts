import {
  type CurrentStoryboard,
  type CurrentStoryboardSummary,
  type StoryboardScene,
  type StoryboardVersionKind,
  type StoryboardVersionSummary,
} from "@sweet-star/shared";

export const storyboardDirectoryName = "storyboards";
export const storyboardRawDirectoryName = "raw";
export const storyboardVersionsDirectoryName = "versions";
export const currentStoryboardDirectoryName = "storyboard";
export const currentStoryboardJsonFileName = "current.json";
export const currentStoryboardMarkdownFileName = "current.md";
export const currentStoryboardJsonRelPath =
  `${currentStoryboardDirectoryName}/${currentStoryboardJsonFileName}`;
export const currentStoryboardMarkdownRelPath =
  `${currentStoryboardDirectoryName}/${currentStoryboardMarkdownFileName}`;

export interface StoryboardDocument {
  summary: string;
  scenes: StoryboardScene[];
}

export interface StoryboardVersionRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceTaskId: string;
  versionNumber: number;
  kind: StoryboardVersionKind;
  provider: string;
  model: string;
  storageDir: string;
  fileRelPath: string;
  rawResponseRelPath: string;
  createdAt: string;
}

export interface CreateStoryboardVersionRecordInput {
  id: string;
  projectId: string;
  sourceTaskId: string;
  versionNumber: number;
  provider: string;
  model: string;
  projectStorageDir: string;
  createdAt: string;
  kind?: StoryboardVersionKind;
}

export function toStoryboardVersionsStorageDir(projectStorageDir: string) {
  return `${projectStorageDir}/${storyboardDirectoryName}/${storyboardVersionsDirectoryName}`;
}

export function toStoryboardVersionFileRelPath(
  versionNumber: number,
  kind: StoryboardVersionKind,
) {
  return `${storyboardDirectoryName}/${storyboardVersionsDirectoryName}/v${versionNumber}-${kind}.json`;
}

export function toStoryboardRawResponseRelPath(taskId: string, provider: string) {
  return `${storyboardDirectoryName}/${storyboardRawDirectoryName}/${taskId}-${provider}-response.json`;
}

export function toStoryboardVersionId(sourceTaskId: string) {
  return sourceTaskId.startsWith("task_")
    ? sourceTaskId.replace(/^task_/, "sbv_")
    : `sbv_${sourceTaskId}`;
}

export function createStoryboardVersionRecord(
  input: CreateStoryboardVersionRecordInput,
): StoryboardVersionRecord {
  const kind = input.kind ?? "ai";

  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceTaskId: input.sourceTaskId,
    versionNumber: input.versionNumber,
    kind,
    provider: input.provider,
    model: input.model,
    storageDir: toStoryboardVersionsStorageDir(input.projectStorageDir),
    fileRelPath: toStoryboardVersionFileRelPath(input.versionNumber, kind),
    rawResponseRelPath: toStoryboardRawResponseRelPath(input.sourceTaskId, input.provider),
    createdAt: input.createdAt,
  };
}

export function toStoryboardVersionSummary(
  version: StoryboardVersionRecord,
): StoryboardVersionSummary {
  return {
    id: version.id,
    projectId: version.projectId,
    versionNumber: version.versionNumber,
    kind: version.kind,
    provider: version.provider,
    model: version.model,
    filePath: version.fileRelPath,
    createdAt: version.createdAt,
    sourceTaskId: version.sourceTaskId,
  };
}

export function toCurrentStoryboard(
  version: StoryboardVersionRecord,
  document: StoryboardDocument,
): CurrentStoryboard {
  return {
    ...toStoryboardVersionSummary(version),
    summary: document.summary,
    scenes: document.scenes,
  };
}

export function toCurrentStoryboardSummary(
  storyboard: CurrentStoryboard,
): CurrentStoryboardSummary {
  const sceneCount = storyboard.scenes.length;
  const segments = storyboard.scenes.flatMap((scene) => scene.segments);
  const segmentCount = segments.length;
  const durationValues = segments
    .map((segment) => segment.durationSec)
    .filter((duration): duration is number => typeof duration === "number");

  return {
    id: storyboard.id,
    title: storyboard.title,
    episodeTitle: storyboard.episodeTitle,
    sourceMasterPlotId: storyboard.sourceMasterPlotId,
    sourceTaskId: storyboard.sourceTaskId,
    updatedAt: storyboard.updatedAt,
    approvedAt: storyboard.approvedAt,
    sceneCount,
    segmentCount,
    totalDurationSec:
      durationValues.length > 0
        ? durationValues.reduce((total, duration) => total + duration, 0)
        : null,
  };
}
