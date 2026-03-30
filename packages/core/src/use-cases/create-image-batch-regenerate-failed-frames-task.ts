import { imageBatchRegenerateFailedFramesQueueName } from "../domain/task";
import {
  createImageBatchTaskUseCase,
  type CreateImageBatchTaskInput,
  type CreateImageBatchTaskUseCase,
  type CreateImageBatchTaskUseCaseDependencies,
} from "./create-image-batch-task-helper";

export type CreateImageBatchRegenerateFailedFramesTaskInput = CreateImageBatchTaskInput;
export type CreateImageBatchRegenerateFailedFramesTaskUseCase = CreateImageBatchTaskUseCase;
export type CreateImageBatchRegenerateFailedFramesTaskUseCaseDependencies =
  CreateImageBatchTaskUseCaseDependencies;

export const createCreateImageBatchRegenerateFailedFramesTaskUseCase =
  createImageBatchTaskUseCase({
    taskType: "image_batch_regenerate_failed_frames",
    queueName: imageBatchRegenerateFailedFramesQueueName,
    buildInput: ({ taskId, projectId, batchId }) => ({
      taskId,
      projectId,
      taskType: "image_batch_regenerate_failed_frames",
      batchId,
    }),
  });
