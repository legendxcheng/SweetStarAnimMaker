import type { TaskRepository } from "../ports/task-repository";

export async function isTaskStillActive(taskRepository: TaskRepository, taskId: string) {
  return (await taskRepository.findById(taskId)) !== null;
}
