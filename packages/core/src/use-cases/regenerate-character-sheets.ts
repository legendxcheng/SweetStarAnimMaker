import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { CreateCharacterSheetsGenerateTaskUseCase } from "./create-character-sheets-generate-task";

export interface RegenerateCharacterSheetsInput {
  projectId: string;
}

export interface RegenerateCharacterSheetsUseCase {
  execute(input: RegenerateCharacterSheetsInput): Promise<TaskDetail>;
}

export interface RegenerateCharacterSheetsUseCaseDependencies {
  projectRepository: ProjectRepository;
  createCharacterSheetsGenerateTask: CreateCharacterSheetsGenerateTaskUseCase;
  clock: Clock;
}

const characterSheetsRegenerateAllowedStatuses = new Set([
  "master_plot_approved",
  "character_sheets_generating",
  "character_sheets_in_review",
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

export function createRegenerateCharacterSheetsUseCase(
  dependencies: RegenerateCharacterSheetsUseCaseDependencies,
): RegenerateCharacterSheetsUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (
        !project.currentMasterPlotId ||
        !characterSheetsRegenerateAllowedStatuses.has(project.status)
      ) {
        throw new ProjectValidationError(
          "Character sheets regenerate requires an approved master plot",
        );
      }

      const timestamp = dependencies.clock.now();
      await dependencies.projectRepository.updateCurrentCharacterSheetBatch({
        projectId: project.id,
        batchId: null,
      });
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
        status: "master_plot_approved",
        updatedAt: timestamp,
      });

      return dependencies.createCharacterSheetsGenerateTask.execute({
        projectId: project.id,
      });
    },
  };
}
