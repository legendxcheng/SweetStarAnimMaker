import { imageBatchRegenerateAllPromptsQueueName } from "../domain/task";
import {
  createImageBatchTaskUseCase,
  type CreateImageBatchTaskInput,
  type CreateImageBatchTaskUseCase,
  type CreateImageBatchTaskUseCaseDependencies,
} from "./create-image-batch-task-helper";

export type CreateImageBatchRegenerateAllPromptsTaskInput = CreateImageBatchTaskInput;
export type CreateImageBatchRegenerateAllPromptsTaskUseCase = CreateImageBatchTaskUseCase;
export type CreateImageBatchRegenerateAllPromptsTaskUseCaseDependencies =
  CreateImageBatchTaskUseCaseDependencies;

export const createCreateImageBatchRegenerateAllPromptsTaskUseCase =
  createImageBatchTaskUseCase({
    taskType: "image_batch_regenerate_all_prompts",
    queueName: imageBatchRegenerateAllPromptsQueueName,
    buildInput: ({ taskId, projectId, batchId }) => ({
      taskId,
      projectId,
      taskType: "image_batch_regenerate_all_prompts",
      batchId,
    }),
  });
