import type { RegenerateFailedFramePromptsUseCase } from "./regenerate-failed-frame-prompts";
import {
  createProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskInput,
  type ProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskUseCaseDependencies,
} from "./process-image-batch-task-helper";

export type ProcessImageBatchRegenerateFailedPromptsTaskInput =
  ProcessImageBatchDelegateTaskInput;
export type ProcessImageBatchRegenerateFailedPromptsTaskUseCase =
  ProcessImageBatchDelegateTaskUseCase;
export interface ProcessImageBatchRegenerateFailedPromptsTaskUseCaseDependencies
  extends ProcessImageBatchDelegateTaskUseCaseDependencies {
  regenerateFailedFramePrompts: RegenerateFailedFramePromptsUseCase;
}

export const createProcessImageBatchRegenerateFailedPromptsTaskUseCase = (
  dependencies: ProcessImageBatchRegenerateFailedPromptsTaskUseCaseDependencies,
): ProcessImageBatchRegenerateFailedPromptsTaskUseCase =>
  createProcessImageBatchDelegateTaskUseCase({
    expectedTaskType: "image_batch_regenerate_failed_prompts",
    run: ({ projectId }) =>
      dependencies.regenerateFailedFramePrompts.execute({
        projectId,
      }),
  })(dependencies);
