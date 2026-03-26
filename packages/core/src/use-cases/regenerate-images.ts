import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { CreateImagesGenerateTaskUseCase } from "./create-images-generate-task";

export interface RegenerateImagesInput {
  projectId: string;
}

export interface RegenerateImagesUseCase {
  execute(input: RegenerateImagesInput): Promise<TaskDetail>;
}

export interface RegenerateImagesUseCaseDependencies {
  projectRepository: ProjectRepository;
  createImagesGenerateTask: CreateImagesGenerateTaskUseCase;
  clock: Clock;
}

const imagesRegenerateAllowedStatuses = new Set([
  "shot_script_approved",
  "images_generating",
  "images_in_review",
  "images_approved",
  "videos_generating",
  "videos_in_review",
  "videos_approved",
]);

export function createRegenerateImagesUseCase(
  dependencies: RegenerateImagesUseCaseDependencies,
): RegenerateImagesUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (
        !project.currentShotScriptId ||
        !imagesRegenerateAllowedStatuses.has(project.status)
      ) {
        throw new ProjectValidationError("Image regenerate requires an approved shot script");
      }

      const timestamp = dependencies.clock.now();
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
        status: "shot_script_approved",
        updatedAt: timestamp,
      });

      return dependencies.createImagesGenerateTask.execute({
        projectId: project.id,
      });
    },
  };
}
