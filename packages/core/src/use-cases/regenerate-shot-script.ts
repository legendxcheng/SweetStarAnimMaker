import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { CreateShotScriptGenerateTaskUseCase } from "./create-shot-script-generate-task";

export interface RegenerateShotScriptInput {
  projectId: string;
}

export interface RegenerateShotScriptUseCase {
  execute(input: RegenerateShotScriptInput): Promise<TaskDetail>;
}

export interface RegenerateShotScriptUseCaseDependencies {
  projectRepository: ProjectRepository;
  createShotScriptGenerateTask: CreateShotScriptGenerateTaskUseCase;
  clock: Clock;
}

const shotScriptRegenerateAllowedStatuses = new Set([
  "storyboard_approved",
  "shot_script_generating",
  "shot_script_in_review",
  "shot_script_approved",
  "images_generating",
  "images_in_review",
  "images_approved",
  "videos_generating",
  "videos_in_review",
  "videos_approved",
]);

export function createRegenerateShotScriptUseCase(
  dependencies: RegenerateShotScriptUseCaseDependencies,
): RegenerateShotScriptUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (
        !project.currentStoryboardId ||
        !shotScriptRegenerateAllowedStatuses.has(project.status)
      ) {
        throw new ProjectValidationError(
          "Shot script regenerate requires an approved storyboard",
        );
      }

      const timestamp = dependencies.clock.now();
      await dependencies.projectRepository.updateCurrentShotScript({
        projectId: project.id,
        shotScriptId: null,
      });
      await dependencies.projectRepository.updateCurrentImageBatch({
        projectId: project.id,
        batchId: null,
      });
      await dependencies.projectRepository.updateCurrentVideoBatch?.({
        projectId: project.id,
        batchId: null,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_approved",
        updatedAt: timestamp,
      });

      return dependencies.createShotScriptGenerateTask.execute({
        projectId: project.id,
        preserveApprovedSegments: false,
      });
    },
  };
}
