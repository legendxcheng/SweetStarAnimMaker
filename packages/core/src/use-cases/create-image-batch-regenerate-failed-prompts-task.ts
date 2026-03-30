import { imageBatchRegenerateFailedPromptsQueueName } from "../domain/task";
import {
  createImageBatchTaskUseCase,
  type CreateImageBatchTaskInput,
  type CreateImageBatchTaskUseCase,
  type CreateImageBatchTaskUseCaseDependencies,
} from "./create-image-batch-task-helper";

export type CreateImageBatchRegenerateFailedPromptsTaskInput = CreateImageBatchTaskInput;
export type CreateImageBatchRegenerateFailedPromptsTaskUseCase = CreateImageBatchTaskUseCase;
export type CreateImageBatchRegenerateFailedPromptsTaskUseCaseDependencies =
  CreateImageBatchTaskUseCaseDependencies;

export const createCreateImageBatchRegenerateFailedPromptsTaskUseCase =
  createImageBatchTaskUseCase({
    taskType: "image_batch_regenerate_failed_prompts",
    queueName: imageBatchRegenerateFailedPromptsQueueName,
    buildInput: ({ taskId, projectId, batchId }) => ({
      taskId,
      projectId,
      taskType: "image_batch_regenerate_failed_prompts",
      batchId,
    }),
  });
