import type { StoryboardGenerateTaskInput, TaskRecord } from "../domain/task";

export interface CreateTaskArtifactsInput {
  task: TaskRecord;
  input: StoryboardGenerateTaskInput;
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
  ): Promise<StoryboardGenerateTaskInput> | StoryboardGenerateTaskInput;
  writeTaskOutput(input: WriteTaskOutputInput): Promise<void> | void;
  appendTaskLog(input: AppendTaskLogInput): Promise<void> | void;
}
