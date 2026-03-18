import type { StoryboardReviewWorkspace, TaskDetail } from "@sweet-star/shared";

import { toCurrentStoryboard } from "../domain/storyboard";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetStoryboardReviewInput {
  projectId: string;
}

export interface GetStoryboardReviewUseCase {
  execute(input: GetStoryboardReviewInput): Promise<StoryboardReviewWorkspace>;
}

export interface GetStoryboardReviewUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
  storyboardStorage: StoryboardStorage;
  storyboardReviewRepository: StoryboardReviewRepository;
  taskRepository: TaskRepository;
}

export function createGetStoryboardReviewUseCase(
  dependencies: GetStoryboardReviewUseCaseDependencies,
): GetStoryboardReviewUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentVersion = await dependencies.storyboardVersionRepository.findCurrentByProjectId(
        project.id,
      );

      if (!currentVersion) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      const storyboard = await dependencies.storyboardStorage.readStoryboardVersion({
        version: currentVersion,
      });
      const latestReview = await dependencies.storyboardReviewRepository.findLatestByProjectId(
        project.id,
      );
      const latestTask = await dependencies.taskRepository.findLatestByProjectId(
        project.id,
        "storyboard_generate",
      );

      return {
        projectId: project.id,
        projectStatus: project.status,
        currentStoryboard: toCurrentStoryboard(currentVersion, storyboard),
        latestReview,
        availableActions: {
          saveHumanVersion: project.status === "storyboard_in_review",
          approve: project.status === "storyboard_in_review",
          reject: project.status === "storyboard_in_review",
        },
        latestStoryboardTask: latestTask ? toTaskDetailDto(latestTask) : null,
      };
    },
  };
}
