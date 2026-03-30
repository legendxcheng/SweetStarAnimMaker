import type { RegenerateFailedFrameImagesUseCase } from "./regenerate-failed-frame-images";
import {
  createProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskInput,
  type ProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskUseCaseDependencies,
} from "./process-image-batch-task-helper";

export type ProcessImageBatchRegenerateFailedFramesTaskInput =
  ProcessImageBatchDelegateTaskInput;
export type ProcessImageBatchRegenerateFailedFramesTaskUseCase =
  ProcessImageBatchDelegateTaskUseCase;
export interface ProcessImageBatchRegenerateFailedFramesTaskUseCaseDependencies
  extends ProcessImageBatchDelegateTaskUseCaseDependencies {
  regenerateFailedFrameImages: RegenerateFailedFrameImagesUseCase;
}

export const createProcessImageBatchRegenerateFailedFramesTaskUseCase = (
  dependencies: ProcessImageBatchRegenerateFailedFramesTaskUseCaseDependencies,
): ProcessImageBatchRegenerateFailedFramesTaskUseCase =>
  createProcessImageBatchDelegateTaskUseCase({
    expectedTaskType: "image_batch_regenerate_failed_frames",
    run: ({ projectId }) =>
      dependencies.regenerateFailedFrameImages.execute({
        projectId,
      }),
  })(dependencies);
