import type { TaskDetail } from "@sweet-star/shared";

import {
  createTaskRecord,
  framePromptGenerateQueueName,
  type FramePromptGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface RegenerateFramePromptInput {
  projectId: string;
  frameId: string;
}

export interface RegenerateFramePromptUseCase {
  execute(input: RegenerateFramePromptInput): Promise<TaskDetail>;
}

export interface RegenerateFramePromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  taskRepository: TaskRepository;
  taskFileStorage: TaskFileStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createRegenerateFramePromptUseCase(
  dependencies: RegenerateFramePromptUseCaseDependencies,
): RegenerateFramePromptUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const frame = await dependencies.shotImageRepository.findFrameById(input.frameId);

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      const timestamp = dependencies.clock.now();
      await dependencies.shotImageRepository.updateFrame({
        ...frame,
        planStatus: "pending",
        updatedAt: timestamp,
      });
      const task = createTaskRecord({
        id: dependencies.taskIdGenerator.generateTaskId(),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "frame_prompt_generate",
        queueName: framePromptGenerateQueueName,
        createdAt: timestamp,
      });
      const taskInput: FramePromptGenerateTaskInput = {
        taskId: task.id,
        projectId: project.id,
        taskType: "frame_prompt_generate",
        batchId: frame.batchId,
        frameId: frame.id,
        sourceShotScriptId: frame.sourceShotScriptId,
        segmentId: frame.segmentId,
        sceneId: frame.sceneId,
        frameType: frame.frameType,
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
