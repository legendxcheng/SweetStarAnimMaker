import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { CreateStoryboardGenerateTaskUseCase } from "./create-storyboard-generate-task";

export interface RegenerateStoryboardInput {
  projectId: string;
}

export interface RegenerateStoryboardUseCase {
  execute(input: RegenerateStoryboardInput): Promise<TaskDetail>;
}

export interface RegenerateStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  createStoryboardGenerateTask: CreateStoryboardGenerateTaskUseCase;
  clock: Clock;
}

const storyboardRegenerateAllowedStatuses = new Set([
  "character_sheets_approved",
  "storyboard_generating",
  "storyboard_in_review",
  "storyboard_approved",
  "shot_script_generating",
  "shot_script_in_review",
  "shot_script_approved",
  "images_generating",
  "images_in_review",
  "images_approved",
]);

export function createRegenerateStoryboardUseCase(
  dependencies: RegenerateStoryboardUseCaseDependencies,
): RegenerateStoryboardUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (
        !project.currentCharacterSheetBatchId ||
        !storyboardRegenerateAllowedStatuses.has(project.status)
      ) {
        throw new ProjectValidationError(
          "Storyboard regenerate requires approved character sheets",
        );
      }

      const timestamp = dependencies.clock.now();
      await dependencies.projectRepository.updateCurrentStoryboard({
        projectId: project.id,
        storyboardId: null,
      });
      await dependencies.projectRepository.updateCurrentShotScript({
        projectId: project.id,
        shotScriptId: null,
      });
      await dependencies.projectRepository.updateCurrentImageBatch({
        projectId: project.id,
        batchId: null,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "character_sheets_approved",
        updatedAt: timestamp,
      });

      return dependencies.createStoryboardGenerateTask.execute({
        projectId: project.id,
      });
    },
  };
}
