import type {
  CharacterSheetGenerateTaskInput,
  CharacterSheetsGenerateTaskInput,
  SceneSheetGenerateTaskInput,
  SceneSheetsGenerateTaskInput,
  FinalCutGenerateTaskInput,
  FrameImageGenerateTaskInput,
  FramePromptGenerateTaskInput,
  ImageBatchGenerateAllFramesTaskInput,
  ImageBatchRegenerateAllPromptsTaskInput,
  ImageBatchRegenerateFailedFramesTaskInput,
  ImageBatchRegenerateFailedPromptsTaskInput,
  ImagesGenerateTaskInput,
  MasterPlotGenerateTaskInput,
  SegmentVideoGenerateTaskInput,
  SegmentVideoPromptGenerateTaskInput,
  ShotScriptGenerateTaskInput,
  ShotScriptSegmentGenerateTaskInput,
  StoryboardGenerateTaskInput,
  TaskRecord,
  VideosGenerateTaskInput,
} from "../domain/task";

export type SupportedTaskInput =
  | MasterPlotGenerateTaskInput
  | CharacterSheetsGenerateTaskInput
  | CharacterSheetGenerateTaskInput
  | SceneSheetGenerateTaskInput
  | SceneSheetsGenerateTaskInput
  | FinalCutGenerateTaskInput
  | StoryboardGenerateTaskInput
  | ShotScriptGenerateTaskInput
  | ShotScriptSegmentGenerateTaskInput
  | ImagesGenerateTaskInput
  | ImageBatchGenerateAllFramesTaskInput
  | ImageBatchRegenerateFailedFramesTaskInput
  | ImageBatchRegenerateAllPromptsTaskInput
  | ImageBatchRegenerateFailedPromptsTaskInput
  | FramePromptGenerateTaskInput
  | FrameImageGenerateTaskInput
  | VideosGenerateTaskInput
  | SegmentVideoPromptGenerateTaskInput
  | SegmentVideoGenerateTaskInput;

export interface CreateTaskArtifactsInput {
  task: TaskRecord;
  input: SupportedTaskInput;
}

export interface ReadTaskInputInput {
  task: TaskRecord;
}

export interface WriteTaskOutputInput {
  task: TaskRecord;
  output: unknown;
}

export interface AppendTaskLogInput {
  task: TaskRecord;
  message: string;
}

export interface TaskFileStorage {
  createTaskArtifacts(input: CreateTaskArtifactsInput): Promise<void> | void;
  readTaskInput(input: ReadTaskInputInput): Promise<SupportedTaskInput> | SupportedTaskInput;
  writeTaskOutput(input: WriteTaskOutputInput): Promise<void> | void;
  appendTaskLog(input: AppendTaskLogInput): Promise<void> | void;
}
