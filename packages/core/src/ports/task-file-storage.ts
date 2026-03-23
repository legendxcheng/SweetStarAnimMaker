import type {
  CharacterSheetGenerateTaskInput,
  CharacterSheetsGenerateTaskInput,
  ImageGenerateTaskInput,
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
    | ImageGenerateTaskInput;
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
        | ImageGenerateTaskInput
      >
    | MasterPlotGenerateTaskInput
    | CharacterSheetsGenerateTaskInput
    | CharacterSheetGenerateTaskInput
    | StoryboardGenerateTaskInput
    | ShotScriptGenerateTaskInput
    | ShotScriptSegmentGenerateTaskInput
    | ImagesGenerateTaskInput
    | ImageGenerateTaskInput;
  writeTaskOutput(input: WriteTaskOutputInput): Promise<void> | void;
  appendTaskLog(input: AppendTaskLogInput): Promise<void> | void;
}
