import type { TaskDetail } from "@sweet-star/shared";

import { createShotScriptReviewRecord } from "../domain/shot-script-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { CreateShotScriptGenerateTaskUseCase } from "./create-shot-script-generate-task";

export interface RejectShotScriptInput {
  projectId: string;
  reason: string;
  nextAction: "regenerate" | "edit_manually";
}

export interface RejectShotScriptUseCase {
  execute(input: RejectShotScriptInput): Promise<TaskDetail | null>;
}

export interface RejectShotScriptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  createShotScriptGenerateTask: CreateShotScriptGenerateTaskUseCase;
}

export function createRejectShotScriptUseCase(
  dependencies: RejectShotScriptUseCaseDependencies,
): RejectShotScriptUseCase {
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

      await dependencies.shotScriptReviewRepository.insert(
        createShotScriptReviewRecord({
          id: `ssr_${currentShotScript.id}_${input.nextAction}`,
          projectId: project.id,
          shotScriptId: currentShotScript.id,
          action: "reject",
          reason: input.reason,
          nextAction: input.nextAction,
          createdAt: currentShotScript.updatedAt,
        }),
      );

      if (input.nextAction === "edit_manually") {
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "shot_script_in_review",
          updatedAt: currentShotScript.updatedAt,
        });

        return null;
      }

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_approved",
        updatedAt: currentShotScript.updatedAt,
      });

      const task = await dependencies.createShotScriptGenerateTask.execute({
        projectId: project.id,
      });

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "shot_script_generating",
        updatedAt: task.updatedAt,
      });

      return task;
    },
  };
}
