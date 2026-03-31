import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  finalCutGenerateQueueName,
  type FinalCutGenerateTaskInput,
} from "../domain/task";
import { CurrentVideoBatchNotFoundError, FinalCutApprovalRequiredError } from "../errors/video-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoRepository } from "../ports/video-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface CreateFinalCutGenerateTaskInput {
  projectId: string;
}

export interface CreateFinalCutGenerateTaskUseCase {
  execute(input: CreateFinalCutGenerateTaskInput): Promise<TaskDetail>;
}

export interface CreateFinalCutGenerateTaskUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createCreateFinalCutGenerateTaskUseCase(
  dependencies: CreateFinalCutGenerateTaskUseCaseDependencies,
): CreateFinalCutGenerateTaskUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentVideoBatchId) {
        throw new CurrentVideoBatchNotFoundError(project.id);
      }

      const batch = await dependencies.videoRepository.findBatchById(project.currentVideoBatchId);

      if (!batch) {
        throw new CurrentVideoBatchNotFoundError(project.id);
      }

      const shots = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);

      if (
        shots.length === 0 ||
        shots.some((shot) => shot.status !== "approved" || !shot.videoAssetPath)
      ) {
        throw new FinalCutApprovalRequiredError(project.id);
      }

      const timestamp = dependencies.clock.now();
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "final_cut_generate",
        queueName: finalCutGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: FinalCutGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "final_cut_generate",
        sourceVideoBatchId: batch.id,
      };

      await dependencies.taskRepository.insert(task);
      await dependencies.taskFileStorage.createTaskArtifacts({
        task,
        input: taskInput,
      });
      await dependencies.taskQueue.enqueue({
        taskId: task.id,
        queueName: task.queueName,
        taskType: task.type,
      });

      return toTaskDetailDto(task);
    },
  };
}
