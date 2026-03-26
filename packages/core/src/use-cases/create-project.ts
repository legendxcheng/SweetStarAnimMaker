import type { ProjectDetail } from "@sweet-star/shared";

import { createProjectRecord, toProjectSlug } from "../domain/project";
import { ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { ProjectRepository } from "../ports/project-repository";
import type { PremiseStorage } from "../ports/script-storage";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface CreateProjectInput {
  name: string;
  premiseText: string;
  visualStyleText?: string;
}

export interface CreateProjectUseCase {
  execute(input: CreateProjectInput): Promise<ProjectDetail>;
}

export interface CreateProjectUseCaseDependencies {
  repository: ProjectRepository;
  premiseStorage: PremiseStorage;
  masterPlotStorage: MasterPlotStorage;
  idGenerator: IdGenerator;
  clock: Clock;
}

export function createCreateProjectUseCase(
  dependencies: CreateProjectUseCaseDependencies,
): CreateProjectUseCase {
  return {
    async execute(input) {
      const name = requireNonEmptyText(input.name, "Project name is required");
      const premiseText = requireNonEmptyText(input.premiseText, "Premise is required");
      const visualStyleText = normalizeOptionalText(input.visualStyleText);
      const timestamp = dependencies.clock.now();
      const project = createProjectRecord({
        id: dependencies.idGenerator.generateProjectId(),
        name,
        slug: toProjectSlug(name),
        createdAt: timestamp,
        updatedAt: timestamp,
        premiseUpdatedAt: timestamp,
        visualStyleText,
      });

      const storedPremise = await dependencies.premiseStorage.writePremise({
        storageDir: project.storageDir,
        premiseText,
      });

      await dependencies.masterPlotStorage.initializePromptTemplate({
        storageDir: project.storageDir,
        promptTemplateKey: "master_plot.generate",
      });

      const persistedProject = {
        ...project,
        premiseBytes: storedPremise.premiseBytes,
        premiseRelPath: storedPremise.premiseRelPath,
      };

      try {
        await dependencies.repository.insert(persistedProject);
      } catch (error) {
        await dependencies.premiseStorage.deletePremise({
          storageDir: project.storageDir,
        });
        throw error;
      }

      return toProjectDetailDto(persistedProject, null, null, null, premiseText, visualStyleText);
    },
  };
}

function requireNonEmptyText(value: string, message: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ProjectValidationError(message);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}
