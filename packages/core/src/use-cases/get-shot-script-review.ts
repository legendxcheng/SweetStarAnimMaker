import type { ShotScriptReviewWorkspace } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetShotScriptReviewInput {
  projectId: string;
}

export interface GetShotScriptReviewUseCase {
  execute(input: GetShotScriptReviewInput): Promise<ShotScriptReviewWorkspace>;
}

export interface GetShotScriptReviewUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  taskRepository: TaskRepository;
}

export function createGetShotScriptReviewUseCase(
  dependencies: GetShotScriptReviewUseCaseDependencies,
): GetShotScriptReviewUseCase {
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

      const latestReview = await dependencies.shotScriptReviewRepository.findLatestByProjectId(
        project.id,
      );
      const latestTask = await dependencies.taskRepository.findLatestByProjectId(
        project.id,
        "shot_script_generate",
      );

      return {
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        currentShotScript,
        latestReview,
        latestTask: latestTask ? toTaskDetailDto(latestTask) : null,
        availableActions: {
          save: project.status === "shot_script_in_review",
          approve: project.status === "shot_script_in_review",
          reject: project.status === "shot_script_in_review",
        },
      };
    },
  };
}
