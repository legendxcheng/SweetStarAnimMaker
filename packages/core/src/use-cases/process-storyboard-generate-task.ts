import { createStoryboardVersionRecord, toStoryboardVersionId } from "../domain/storyboard";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ScriptStorage } from "../ports/script-storage";
import type { LlmStoryboardProvider } from "../ports/storyboard-provider";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface ProcessStoryboardGenerateTaskInput {
  taskId: string;
}

export interface ProcessStoryboardGenerateTaskUseCase {
  execute(input: ProcessStoryboardGenerateTaskInput): Promise<void>;
}

export interface ProcessStoryboardGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  scriptStorage: ScriptStorage;
  storyboardProvider: LlmStoryboardProvider;
  storyboardStorage: StoryboardStorage;
  storyboardVersionRepository: StoryboardVersionRepository;
  clock: Clock;
}

export function createProcessStoryboardGenerateTaskUseCase(
  dependencies: ProcessStoryboardGenerateTaskUseCaseDependencies,
): ProcessStoryboardGenerateTaskUseCase {
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
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const script = await dependencies.scriptStorage.readOriginalScript({
          storageDir: project.storageDir,
        });
        const providerResult = await dependencies.storyboardProvider.generateStoryboard({
          projectId: project.id,
          script,
          reviewContext: taskInput.reviewContext,
        });
        const versionNumber =
          (await dependencies.storyboardVersionRepository.getNextVersionNumber?.(
            project.id,
          )) ?? 1;
        const finishedAt = dependencies.clock.now();
        const version = createStoryboardVersionRecord({
          id: toStoryboardVersionId(task.id),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceTaskId: task.id,
          versionNumber,
          provider: providerResult.provider,
          model: providerResult.model,
          createdAt: finishedAt,
        });

        await dependencies.storyboardStorage.writeRawResponse({
          version,
          rawResponse: providerResult.rawResponse,
        });
        await dependencies.storyboardStorage.writeStoryboardVersion({
          version,
          storyboard: providerResult.storyboard,
        });
        await dependencies.storyboardVersionRepository.insert(version);
        await dependencies.projectRepository.updateCurrentStoryboardVersion({
          projectId: project.id,
          storyboardVersionId: version.id,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "storyboard_in_review",
          updatedAt: finishedAt,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            storyboardVersionId: version.id,
            versionNumber: version.versionNumber,
            kind: version.kind,
            provider: version.provider,
            model: version.model,
            filePath: version.fileRelPath,
            rawResponsePath: version.rawResponseRelPath,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "storyboard generation succeeded",
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
          message: `storyboard generation failed: ${errorMessage}`,
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
