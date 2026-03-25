import type {
  CharacterSheetGenerateTaskInput,
  CharacterSheetsGenerateTaskInput,
  FrameImageGenerateTaskInput,
  FramePromptGenerateTaskInput,
  ImagesGenerateTaskInput,
  MasterPlotGenerateTaskInput,
  SegmentVideoGenerateTaskInput,
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
  | StoryboardGenerateTaskInput
  | ShotScriptGenerateTaskInput
  | ShotScriptSegmentGenerateTaskInput
  | ImagesGenerateTaskInput
  | FramePromptGenerateTaskInput
  | FrameImageGenerateTaskInput
  | VideosGenerateTaskInput
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
