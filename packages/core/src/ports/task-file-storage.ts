import type {
  CharacterSheetGenerateTaskInput,
  CharacterSheetsGenerateTaskInput,
  FrameImageGenerateTaskInput,
  FramePromptGenerateTaskInput,
  ImagesGenerateTaskInput,
  MasterPlotGenerateTaskInput,
  ShotScriptGenerateTaskInput,
  ShotScriptSegmentGenerateTaskInput,
  StoryboardGenerateTaskInput,
  TaskRecord,
} from "../domain/task";

export interface CreateTaskArtifactsInput {
  task: TaskRecord;
  input:
    | MasterPlotGenerateTaskInput
    | CharacterSheetsGenerateTaskInput
    | CharacterSheetGenerateTaskInput
    | StoryboardGenerateTaskInput
    | ShotScriptGenerateTaskInput
    | ShotScriptSegmentGenerateTaskInput
    | ImagesGenerateTaskInput
    | FramePromptGenerateTaskInput
    | FrameImageGenerateTaskInput;
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
  readTaskInput(
    input: ReadTaskInputInput,
  ):
    | Promise<
        | MasterPlotGenerateTaskInput
        | CharacterSheetsGenerateTaskInput
        | CharacterSheetGenerateTaskInput
        | StoryboardGenerateTaskInput
        | ShotScriptGenerateTaskInput
        | ShotScriptSegmentGenerateTaskInput
        | ImagesGenerateTaskInput
        | FramePromptGenerateTaskInput
        | FrameImageGenerateTaskInput
      >
    | MasterPlotGenerateTaskInput
    | CharacterSheetsGenerateTaskInput
    | CharacterSheetGenerateTaskInput
    | StoryboardGenerateTaskInput
    | ShotScriptGenerateTaskInput
    | ShotScriptSegmentGenerateTaskInput
    | ImagesGenerateTaskInput
    | FramePromptGenerateTaskInput
    | FrameImageGenerateTaskInput;
  writeTaskOutput(input: WriteTaskOutputInput): Promise<void> | void;
  appendTaskLog(input: AppendTaskLogInput): Promise<void> | void;
}
