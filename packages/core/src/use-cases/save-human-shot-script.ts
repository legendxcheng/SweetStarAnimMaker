import type { CurrentShotScript, SaveShotScriptRequest } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";

export interface SaveHumanShotScriptInput extends SaveShotScriptRequest {
  projectId: string;
}

export interface SaveHumanShotScriptUseCase {
  execute(input: SaveHumanShotScriptInput): Promise<CurrentShotScript>;
}

export interface SaveHumanShotScriptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  clock: Clock;
}

export function createSaveHumanShotScriptUseCase(
  dependencies: SaveHumanShotScriptUseCaseDependencies,
): SaveHumanShotScriptUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!currentShotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const updatedAt = dependencies.clock.now();
      const shotScript: CurrentShotScript = {
        id: currentShotScript.id,
        title: input.title,
        sourceStoryboardId: input.sourceStoryboardId,
        sourceTaskId: input.sourceTaskId,
        updatedAt,
        approvedAt: null,
        shots: input.shots,
      };

      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "shot_script_in_review",
        updatedAt,
      });

      return shotScript;
    },
  };
}
