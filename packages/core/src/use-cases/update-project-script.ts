import type { ProjectDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ScriptStorage } from "../ports/script-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface UpdateProjectScriptInput {
  projectId: string;
  script: string;
}

export interface UpdateProjectScriptUseCase {
  execute(input: UpdateProjectScriptInput): Promise<ProjectDetail>;
}

export interface UpdateProjectScriptUseCaseDependencies {
  repository: ProjectRepository;
  scriptStorage: ScriptStorage;
  clock: Clock;
}

export function createUpdateProjectScriptUseCase(
  dependencies: UpdateProjectScriptUseCaseDependencies,
): UpdateProjectScriptUseCase {
  return {
    async execute(input) {
      const script = input.script.trim();

      if (!script) {
        throw new ProjectValidationError("Script is required");
      }

      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const previousScript = await dependencies.scriptStorage.readOriginalScript({
        storageDir: project.storageDir,
      });
      const storedScript = await dependencies.scriptStorage.writeOriginalScript({
        storageDir: project.storageDir,
        script,
      });
      const timestamp = dependencies.clock.now();

      try {
        await dependencies.repository.updateScriptMetadata({
          id: project.id,
          scriptBytes: storedScript.scriptBytes,
          updatedAt: timestamp,
          scriptUpdatedAt: timestamp,
        });
      } catch (error) {
        await dependencies.scriptStorage.writeOriginalScript({
          storageDir: project.storageDir,
          script: previousScript,
        });
        throw error;
      }

      return toProjectDetailDto({
        ...project,
        scriptBytes: storedScript.scriptBytes,
        scriptRelPath: storedScript.scriptRelPath,
        updatedAt: timestamp,
        scriptUpdatedAt: timestamp,
      });
    },
  };
}
