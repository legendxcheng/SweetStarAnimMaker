import type { TaskDetail } from "@sweet-star/shared";

import { TaskNotFoundError } from "../errors/task-errors";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetTaskDetailInput {
  taskId: string;
}

export interface GetTaskDetailUseCase {
  execute(input: GetTaskDetailInput): Promise<TaskDetail>;
}

export interface GetTaskDetailUseCaseDependencies {
  repository: TaskRepository;
}

export function createGetTaskDetailUseCase(
  dependencies: GetTaskDetailUseCaseDependencies,
): GetTaskDetailUseCase {
  return {
    async execute(input) {
      const task = await dependencies.repository.findById(input.taskId);

      if (!task) {
        throw new TaskNotFoundError(input.taskId);
      }

      return toTaskDetailDto(task);
    },
  };
}
