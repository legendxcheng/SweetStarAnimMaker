import type { CurrentShotScript } from "@sweet-star/shared";

import { toNormalizedCurrentShotScript } from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";

export interface GetCurrentShotScriptInput {
  projectId: string;
}

export interface GetCurrentShotScriptUseCase {
  execute(input: GetCurrentShotScriptInput): Promise<CurrentShotScript>;
}

export interface GetCurrentShotScriptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
}

export function createGetCurrentShotScriptUseCase(
  dependencies: GetCurrentShotScriptUseCaseDependencies,
): GetCurrentShotScriptUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!shotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      return toNormalizedCurrentShotScript(shotScript);
    },
  };
}
