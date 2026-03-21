import type { ProjectDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { PremiseStorage } from "../ports/script-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface UpdateProjectScriptInput {
  projectId: string;
  premiseText: string;
}

export interface UpdateProjectScriptUseCase {
  execute(input: UpdateProjectScriptInput): Promise<ProjectDetail>;
}

export interface UpdateProjectScriptUseCaseDependencies {
  repository: ProjectRepository;
  premiseStorage: PremiseStorage;
  clock: Clock;
}

export function createUpdateProjectScriptUseCase(
  dependencies: UpdateProjectScriptUseCaseDependencies,
): UpdateProjectScriptUseCase {
  return {
    async execute(input) {
      const premiseText = input.premiseText.trim();

      if (!premiseText) {
        throw new ProjectValidationError("Premise is required");
      }

      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const previousPremise = await dependencies.premiseStorage.readPremise({
        storageDir: project.storageDir,
      });
      const storedPremise = await dependencies.premiseStorage.writePremise({
        storageDir: project.storageDir,
        premiseText,
      });
      const timestamp = dependencies.clock.now();

      try {
        await dependencies.repository.updatePremiseMetadata({
          id: project.id,
          premiseBytes: storedPremise.premiseBytes,
          updatedAt: timestamp,
          premiseUpdatedAt: timestamp,
        });
      } catch (error) {
        await dependencies.premiseStorage.writePremise({
          storageDir: project.storageDir,
          premiseText: previousPremise,
        });
        throw error;
      }

      return toProjectDetailDto(
        {
          ...project,
          premiseBytes: storedPremise.premiseBytes,
          premiseRelPath: storedPremise.premiseRelPath,
          updatedAt: timestamp,
          premiseUpdatedAt: timestamp,
        },
        null,
        null,
        null,
      );
    },
  };
}
