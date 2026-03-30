import { imageBatchGenerateAllFramesQueueName } from "../domain/task";
import {
  createImageBatchTaskUseCase,
  type CreateImageBatchTaskInput,
  type CreateImageBatchTaskUseCase,
  type CreateImageBatchTaskUseCaseDependencies,
} from "./create-image-batch-task-helper";

export type CreateImageBatchGenerateAllFramesTaskInput = CreateImageBatchTaskInput;
export type CreateImageBatchGenerateAllFramesTaskUseCase = CreateImageBatchTaskUseCase;
export type CreateImageBatchGenerateAllFramesTaskUseCaseDependencies =
  CreateImageBatchTaskUseCaseDependencies;

export const createCreateImageBatchGenerateAllFramesTaskUseCase =
  createImageBatchTaskUseCase({
    taskType: "image_batch_generate_all_frames",
    queueName: imageBatchGenerateAllFramesQueueName,
    buildInput: ({ taskId, projectId, batchId }) => ({
      taskId,
      projectId,
      taskType: "image_batch_generate_all_frames",
      batchId,
    }),
  });
