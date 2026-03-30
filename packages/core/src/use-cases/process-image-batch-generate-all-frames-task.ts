import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentImageBatchNotFoundError } from "../errors/shot-image-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import type { GenerateFrameImageUseCase } from "./generate-frame-image";

export interface ProcessImageBatchGenerateAllFramesTaskInput {
  taskId: string;
}

export interface ProcessImageBatchGenerateAllFramesTaskUseCase {
  execute(input: ProcessImageBatchGenerateAllFramesTaskInput): Promise<void>;
}

export interface ProcessImageBatchGenerateAllFramesTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotImageRepository: ShotImageRepository;
  generateFrameImage: GenerateFrameImageUseCase;
  clock: Clock;
}

export function createProcessImageBatchGenerateAllFramesTaskUseCase(
  dependencies: ProcessImageBatchGenerateAllFramesTaskUseCaseDependencies,
): ProcessImageBatchGenerateAllFramesTaskUseCase {
  return {
    async execute(input) {
      const task = await dependencies.taskRepository.findById(input.taskId);

      if (!task) {
        throw new TaskNotFoundError(input.taskId);
      }

      const startedAt = dependencies.clock.now();

      await dependencies.taskRepository.markRunning({
        taskId: task.id,
        updatedAt: startedAt,
        startedAt,
      });

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });

        if (taskInput.taskType !== "image_batch_generate_all_frames") {
          throw new Error(
            `Unsupported task input for image batch frame generation: ${taskInput.taskType}`,
          );
        }

        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const batch = await dependencies.shotImageRepository.findBatchById(taskInput.batchId);

        if (!batch) {
          throw new CurrentImageBatchNotFoundError(project.id);
        }

        const shots = (
          (await dependencies.shotImageRepository.listShotsByBatchId?.(taskInput.batchId)) ?? []
        ).slice().sort((left, right) => {
          if (left.segmentOrder !== right.segmentOrder) {
            return left.segmentOrder - right.segmentOrder;
          }

          return left.shotOrder - right.shotOrder;
        });
        const createdTaskIds: string[] = [];
        const skippedReasons = {
          missing_start_frame_image_for_end_frame: 0,
        };

        for (const shot of shots) {
          const startTask = await dependencies.generateFrameImage.execute({
            projectId: project.id,
            frameId: shot.startFrame.id,
          });

          createdTaskIds.push(startTask.id);

          if (!shot.endFrame) {
            continue;
          }

          if (!shot.startFrame.imageAssetPath) {
            skippedReasons.missing_start_frame_image_for_end_frame += 1;
            await dependencies.taskFileStorage.appendTaskLog({
              task,
              message: `skipped end frame ${shot.endFrame.id}: start frame image missing`,
            });
            continue;
          }

          const endTask = await dependencies.generateFrameImage.execute({
            projectId: project.id,
            frameId: shot.endFrame.id,
          });

          createdTaskIds.push(endTask.id);
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            batchId: batch.id,
            scannedShotCount: shots.length,
            createdTaskCount: createdTaskIds.length,
            childTaskIds: createdTaskIds,
            skippedCount: skippedReasons.missing_start_frame_image_for_end_frame,
            skippedReasons,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `image_batch_generate_all_frames succeeded with ${createdTaskIds.length} child task(s)`,
        });
        await dependencies.taskRepository.markSucceeded({
          taskId: task.id,
          updatedAt: finishedAt,
          finishedAt,
        });
      } catch (error) {
        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `image_batch_generate_all_frames failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        throw error;
      }
    },
  };
}
