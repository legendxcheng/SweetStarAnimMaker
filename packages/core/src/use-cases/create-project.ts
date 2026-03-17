import type { ProjectDetail } from "@sweet-star/shared";

import { createProjectRecord, toProjectSlug } from "../domain/project";
import { ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { ProjectRepository } from "../ports/project-repository";
import type { ScriptStorage } from "../ports/script-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface CreateProjectInput {
  name: string;
  script: string;
}

export interface CreateProjectUseCase {
  execute(input: CreateProjectInput): Promise<ProjectDetail>;
}

export interface CreateProjectUseCaseDependencies {
  repository: ProjectRepository;
  scriptStorage: ScriptStorage;
  idGenerator: IdGenerator;
  clock: Clock;
}

export function createCreateProjectUseCase(
  dependencies: CreateProjectUseCaseDependencies,
): CreateProjectUseCase {
  return {
    async execute(input) {
      const name = requireNonEmptyText(input.name, "Project name is required");
      const script = requireNonEmptyText(input.script, "Script is required");
      const timestamp = dependencies.clock.now();
      const project = createProjectRecord({
        id: dependencies.idGenerator.generateProjectId(),
        name,
        slug: toProjectSlug(name),
        createdAt: timestamp,
        updatedAt: timestamp,
        scriptUpdatedAt: timestamp,
      });

      const storedScript = await dependencies.scriptStorage.writeOriginalScript({
        storageDir: project.storageDir,
        script,
      });
      const persistedProject = {
        ...project,
        scriptBytes: storedScript.scriptBytes,
        scriptRelPath: storedScript.scriptRelPath,
      };

      try {
        await dependencies.repository.insert(persistedProject);
      } catch (error) {
        await dependencies.scriptStorage.deleteOriginalScript({
          storageDir: project.storageDir,
        });
        throw error;
      }

      return toProjectDetailDto(persistedProject);
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
