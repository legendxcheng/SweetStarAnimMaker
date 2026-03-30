import type { RegenerateAllFramePromptsUseCase } from "./regenerate-all-frame-prompts";
import {
  createProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskInput,
  type ProcessImageBatchDelegateTaskUseCase,
  type ProcessImageBatchDelegateTaskUseCaseDependencies,
} from "./process-image-batch-task-helper";

export type ProcessImageBatchRegenerateAllPromptsTaskInput =
  ProcessImageBatchDelegateTaskInput;
export type ProcessImageBatchRegenerateAllPromptsTaskUseCase =
  ProcessImageBatchDelegateTaskUseCase;
export interface ProcessImageBatchRegenerateAllPromptsTaskUseCaseDependencies
  extends ProcessImageBatchDelegateTaskUseCaseDependencies {
  regenerateAllFramePrompts: RegenerateAllFramePromptsUseCase;
}

export const createProcessImageBatchRegenerateAllPromptsTaskUseCase = (
  dependencies: ProcessImageBatchRegenerateAllPromptsTaskUseCaseDependencies,
): ProcessImageBatchRegenerateAllPromptsTaskUseCase =>
  createProcessImageBatchDelegateTaskUseCase({
    expectedTaskType: "image_batch_regenerate_all_prompts",
    run: ({ projectId }) =>
      dependencies.regenerateAllFramePrompts.execute({
        projectId,
      }),
  })(dependencies);
