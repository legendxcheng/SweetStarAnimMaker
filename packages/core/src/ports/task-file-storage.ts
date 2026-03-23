import type {
  CharacterSheetGenerateTaskInput,
  CharacterSheetsGenerateTaskInput,
  MasterPlotGenerateTaskInput,
  ShotScriptGenerateTaskInput,
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
    | ShotScriptGenerateTaskInput;
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
      >
    | MasterPlotGenerateTaskInput
    | CharacterSheetsGenerateTaskInput
    | CharacterSheetGenerateTaskInput
    | StoryboardGenerateTaskInput
    | ShotScriptGenerateTaskInput;
  writeTaskOutput(input: WriteTaskOutputInput): Promise<void> | void;
  appendTaskLog(input: AppendTaskLogInput): Promise<void> | void;
}
