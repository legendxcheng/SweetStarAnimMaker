import type {
  CurrentShotScript,
  SegmentVideoReferenceAudio,
  SegmentVideoReferenceImage,
  ShotFrameDependency,
  ShotScriptItem,
  ShotScriptSegment,
  TaskStatus,
  TaskType,
} from "@sweet-star/shared";

export const masterPlotGenerateQueueName = "master-plot-generate";
export const characterSheetsGenerateQueueName = "character-sheets-generate";
export const characterSheetGenerateQueueName = "character-sheet-generate";
export const sceneSheetsGenerateQueueName = "scene-sheets-generate";
export const sceneSheetGenerateQueueName = "scene-sheet-generate";
export const storyboardGenerateQueueName = "storyboard-generate";
export const shotScriptGenerateQueueName = "shot-script-generate";
export const shotScriptSegmentGenerateQueueName = "shot-script-segment-generate";
export const imagesGenerateQueueName = "images-generate";
export const imageBatchGenerateAllFramesQueueName = "image-batch-generate-all-frames";
export const imageBatchRegenerateFailedFramesQueueName =
  "image-batch-regenerate-failed-frames";
export const imageBatchRegenerateAllPromptsQueueName =
  "image-batch-regenerate-all-prompts";
export const imageBatchRegenerateFailedPromptsQueueName =
  "image-batch-regenerate-failed-prompts";
export const framePromptGenerateQueueName = "frame-prompt-generate";
export const frameImageGenerateQueueName = "frame-image-generate";
export const videosGenerateQueueName = "videos-generate";
export const segmentVideoPromptGenerateQueueName = "segment-video-prompt-generate";
export const segmentVideoGenerateQueueName = "segment-video-generate";
export const finalCutGenerateQueueName = "final-cut-generate";
export const taskArtifactsDirectoryName = "tasks";
export const taskInputFileName = "input.json";
export const taskOutputFileName = "output.json";
export const taskLogFileName = "log.txt";

export interface TaskRecord {
  id: string;
  projectId: string;
  type: TaskType;
  status: TaskStatus;
  queueName: string;
  storageDir: string;
  inputRelPath: string;
  outputRelPath: string;
  logRelPath: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface MasterPlotGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "master_plot_generate";
  premiseText: string;
  promptTemplateKey: "master_plot.generate";
}

export interface StoryboardGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "storyboard_generate";
  sourceMasterPlotId: string;
  masterPlot: {
    title: string | null;
    logline: string;
    synopsis: string;
    mainCharacters: string[];
    coreConflict: string;
    emotionalArc: string;
    endingBeat: string;
    targetDurationSec: number | null;
  };
  promptTemplateKey: "storyboard.generate";
  model: "gemini-3.1-pro-preview";
}

export interface CharacterSheetsGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "character_sheets_generate";
  sourceMasterPlotId: string;
  mainCharacters: string[];
}

export interface CharacterSheetGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "character_sheet_generate";
  batchId: string;
  characterId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextCurrent: string;
  imagePromptTemplateKey: "character_sheet.turnaround.generate";
  referenceImagePaths?: string[];
}

export interface SceneSheetsGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "scene_sheets_generate";
  batchId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
}

export interface SceneSheetGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "scene_sheet_generate";
  batchId: string;
  sceneId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextCurrent: string;
  constraintsText: string;
  imagePromptTemplateKey: "scene_sheet.generate";
}

export interface ShotScriptGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
  preserveApprovedSegments?: boolean;
  sourceMasterPlotId?: string;
  sourceCharacterSheetBatchId?: string;
  storyboard: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
    scenes: Array<{
      id: string;
      order: number;
      name: string;
      dramaticPurpose: string;
      segments: Array<{
        id: string;
        order: number;
        durationSec: number | null;
        visual: string;
        characterAction: string;
        dialogue: string;
        voiceOver: string;
        audio: string;
        purpose: string;
      }>;
    }>;
  };
  masterPlot?: {
    id: string;
    title: string | null;
    logline: string;
    synopsis: string;
    mainCharacters: string[];
    coreConflict: string;
    emotionalArc: string;
    endingBeat: string;
    targetDurationSec: number | null;
  };
  characterSheets?: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath?: string | null;
  }>;
  promptTemplateKey: "shot_script.generate" | "shot_script.segment.generate";
}

export interface ShotScriptSegmentSnapshot {
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

export interface ShotScriptSceneSnapshot {
  id: string;
  order: number;
  name: string;
  dramaticPurpose: string;
  segments: ShotScriptSegmentSnapshot[];
}

export interface ShotScriptSegmentGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "shot_script_segment_generate";
  sourceStoryboardId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  segment: ShotScriptSegmentSnapshot;
  previousSegment?: ShotScriptSegmentSnapshot | null;
  nextSegment?: ShotScriptSegmentSnapshot | null;
  scene: Omit<ShotScriptSceneSnapshot, "segments">;
  sceneSegmentIndex?: number;
  sceneSegmentCount?: number;
  storyboardTitle: string | null;
  episodeTitle: string | null;
  sourceMasterPlotId?: string;
  masterPlot?: ShotScriptGenerateTaskInput["masterPlot"];
  sourceCharacterSheetBatchId?: string;
  characterSheets?: ShotScriptGenerateTaskInput["characterSheets"];
  promptTemplateKey: "shot_script.segment.generate";
}

export interface ImagesGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "images_generate";
  sourceShotScriptId: string;
}

export interface ImageBatchGenerateAllFramesTaskInput {
  taskId: string;
  projectId: string;
  taskType: "image_batch_generate_all_frames";
  batchId: string;
}

export interface ImageBatchRegenerateFailedFramesTaskInput {
  taskId: string;
  projectId: string;
  taskType: "image_batch_regenerate_failed_frames";
  batchId: string;
}

export interface ImageBatchRegenerateAllPromptsTaskInput {
  taskId: string;
  projectId: string;
  taskType: "image_batch_regenerate_all_prompts";
  batchId: string;
}

export interface ImageBatchRegenerateFailedPromptsTaskInput {
  taskId: string;
  projectId: string;
  taskType: "image_batch_regenerate_failed_prompts";
  batchId: string;
}

export interface FramePromptGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "frame_prompt_generate";
  batchId: string;
  shotId?: string;
  frameId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  frameType: "start_frame" | "end_frame";
}

export interface FrameImageGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "frame_image_generate";
  batchId: string;
  frameId: string;
}

export interface VideosGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "videos_generate";
  sourceImageBatchId: string;
  imageBatch: {
    id: string;
    sourceShotScriptId: string;
    shotCount: number;
    totalRequiredFrameCount: number;
    approvedShotCount: number;
    updatedAt: string;
    segmentCount?: number;
    totalFrameCount?: number;
    approvedFrameCount?: number;
  };
  sourceShotScriptId: string;
  shotScript: CurrentShotScript;
  sourceStoryboardId?: string;
  storyboard?: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
  };
  promptTemplateKey: "segment_video.generate";
}

export interface SegmentVideoGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "segment_video_generate";
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  segmentOrder?: number;
  segmentName?: string | null;
  segmentSummary?: string;
  shotCount?: number;
  sourceShotIds?: string[];
  shotId: string;
  shotCode: string;
  frameDependency: ShotFrameDependency;
  segment: ShotScriptSegment;
  shots?: ShotScriptItem[];
  shot: ShotScriptItem;
  referenceImages?: SegmentVideoReferenceImage[];
  referenceAudios?: SegmentVideoReferenceAudio[];
  startFrame: {
    id: string;
    imageAssetPath: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  };
  endFrame: {
    id: string;
    imageAssetPath: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  } | null;
  promptTemplateKey: "segment_video.generate";
}

export interface SegmentVideoPromptGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "segment_video_prompt_generate";
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  segmentOrder?: number;
  segmentName?: string | null;
  segmentSummary?: string;
  shotCount?: number;
  sourceShotIds?: string[];
  shotId: string;
  shotCode: string;
  frameDependency: ShotFrameDependency;
  segment: ShotScriptSegment;
  shots?: ShotScriptItem[];
  shot: ShotScriptItem;
  referenceImages?: SegmentVideoReferenceImage[];
  referenceAudios?: SegmentVideoReferenceAudio[];
  startFrame: {
    id: string;
    imageAssetPath: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  };
  endFrame: {
    id: string;
    imageAssetPath: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  } | null;
  promptTemplateKey: "segment_video.generate";
}

export interface FinalCutGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "final_cut_generate";
  sourceVideoBatchId: string;
}

export interface CreateTaskRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  type: TaskType;
  queueName: string;
  createdAt: string;
  updatedAt?: string;
  status?: TaskStatus;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export function toTaskStorageDir(projectStorageDir: string, taskId: string) {
  return `${projectStorageDir}/${taskArtifactsDirectoryName}/${taskId}`;
}

export function toTaskInputRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskInputFileName}`;
}

export function toTaskOutputRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskOutputFileName}`;
}

export function toTaskLogRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskLogFileName}`;
}

export function createTaskRecord(input: CreateTaskRecordInput): TaskRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    type: input.type,
    status: input.status ?? "pending",
    queueName: input.queueName,
    storageDir: toTaskStorageDir(input.projectStorageDir, input.id),
    inputRelPath: toTaskInputRelPath(input.id),
    outputRelPath: toTaskOutputRelPath(input.id),
    logRelPath: toTaskLogRelPath(input.id),
    errorMessage: input.errorMessage ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
  };
}
