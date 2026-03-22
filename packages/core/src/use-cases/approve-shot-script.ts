import type { ApproveShotScriptRequest, CurrentShotScript } from "@sweet-star/shared";

import { createShotScriptReviewRecord } from "../domain/shot-script-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";

export interface ApproveShotScriptInput extends ApproveShotScriptRequest {
  projectId: string;
}

export interface ApproveShotScriptUseCase {
  execute(input: ApproveShotScriptInput): Promise<CurrentShotScript>;
}

export interface ApproveShotScriptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  clock: Clock;
}

export function createApproveShotScriptUseCase(
  dependencies: ApproveShotScriptUseCaseDependencies,
): ApproveShotScriptUseCase {
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

      const approvedAt = dependencies.clock.now();
      const shotScript: CurrentShotScript = {
        ...currentShotScript,
        updatedAt: approvedAt,
        approvedAt,
      };

      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript,
      });
      await dependencies.shotScriptReviewRepository.insert(
        createShotScriptReviewRecord({
          id: `ssr_${currentShotScript.id}_approve`,
          projectId: project.id,
          shotScriptId: currentShotScript.id,
          action: "approve",
          reason: null,
          nextAction: null,
          createdAt: approvedAt,
        }),
      );
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "shot_script_approved",
        updatedAt: approvedAt,
      });

      return shotScript;
    },
  };
}
