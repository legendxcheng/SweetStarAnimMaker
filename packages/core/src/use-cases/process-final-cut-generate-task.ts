import { createFinalCutRecord } from "../domain/video";
import type { FinalCutGenerateTaskInput } from "../domain/task";
import { CurrentVideoBatchNotFoundError, FinalCutApprovalRequiredError } from "../errors/video-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { FinalCutRenderer } from "../ports/final-cut-renderer";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";

export interface ProcessFinalCutGenerateTaskInput {
  taskId: string;
}

export interface ProcessFinalCutGenerateTaskUseCase {
  execute(input: ProcessFinalCutGenerateTaskInput): Promise<void>;
}

export interface ProcessFinalCutGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  finalCutRenderer: FinalCutRenderer;
  clock: Clock;
}

const segmentOrderCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

export function createProcessFinalCutGenerateTaskUseCase(
  dependencies: ProcessFinalCutGenerateTaskUseCaseDependencies,
): ProcessFinalCutGenerateTaskUseCase {
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
        const taskInput = (await dependencies.taskFileStorage.readTaskInput({
          task,
        })) as FinalCutGenerateTaskInput;
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const batch = await dependencies.videoRepository.findBatchById(taskInput.sourceVideoBatchId);

        if (!batch) {
          throw new CurrentVideoBatchNotFoundError(project.id);
        }

        const segments = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);

        if (
          segments.length === 0 ||
          segments.some((segment) => segment.status !== "approved" || !segment.videoAssetPath)
        ) {
          throw new FinalCutApprovalRequiredError(project.id);
        }

        const orderedSegments = [...segments].sort((left, right) => {
          if (left.segmentOrder !== right.segmentOrder) {
            return left.segmentOrder - right.segmentOrder;
          }

          const sceneCompare = segmentOrderCollator.compare(left.sceneId, right.sceneId);
          if (sceneCompare !== 0) {
            return sceneCompare;
          }

          const segmentCompare = segmentOrderCollator.compare(left.segmentId, right.segmentId);
          if (segmentCompare !== 0) {
            return segmentCompare;
          }

          return segmentOrderCollator.compare(left.id, right.id);
        });
        const finalCut = createFinalCutRecord({
          id: `final_cut_${task.id}`,
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceVideoBatchId: batch.id,
          status: "ready",
          shotCount: orderedSegments.length,
          createdAt: startedAt,
          updatedAt: startedAt,
        });
        const lines: string[] = [];

        for (const segment of orderedSegments) {
          const assetPath = await dependencies.videoStorage.resolveProjectAssetPath({
            projectStorageDir: project.storageDir,
            assetRelPath: segment.videoAssetPath!,
          });
          lines.push(`file '${escapeFfmpegPath(assetPath)}'`);
        }

        await dependencies.videoStorage.writeFinalCutManifest?.({
          finalCut,
          lines,
        });
        const manifestPath = await dependencies.videoStorage.resolveProjectAssetPath({
          projectStorageDir: project.storageDir,
          assetRelPath: finalCut.manifestStorageRelPath,
        });
        const videoContent = await dependencies.finalCutRenderer.render({
          manifestPath,
        });
        const finishedAt = dependencies.clock.now();
        const completedFinalCut = {
          ...finalCut,
          updatedAt: finishedAt,
        };

        await dependencies.videoStorage.writeFinalCutFiles?.({
          finalCut: completedFinalCut,
          videoContent,
        });
        await dependencies.videoRepository.upsertFinalCut?.(completedFinalCut);
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            finalCutId: completedFinalCut.id,
            sourceVideoBatchId: batch.id,
            shotCount: orderedSegments.length,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `final cut generated from ${orderedSegments.length} approved segments`,
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
          message: `final cut failed: ${errorMessage}`,
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

function escapeFfmpegPath(filePath: string) {
  return filePath.replaceAll("'", "'\\''");
}
