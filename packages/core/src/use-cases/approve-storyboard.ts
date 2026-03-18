import type {
  ApproveStoryboardRequest,
  StoryboardReviewRecord,
} from "@sweet-star/shared";

import { createStoryboardReviewRecord } from "../domain/storyboard-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import { StoryboardReviewVersionConflictError } from "../errors/storyboard-review-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";

export interface ApproveStoryboardInput extends ApproveStoryboardRequest {
  projectId: string;
}

export interface ApproveStoryboardUseCase {
  execute(input: ApproveStoryboardInput): Promise<StoryboardReviewRecord>;
}

export interface ApproveStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
  storyboardReviewRepository: StoryboardReviewRepository;
  clock: Clock;
}

export function createApproveStoryboardUseCase(
  dependencies: ApproveStoryboardUseCaseDependencies,
): ApproveStoryboardUseCase {
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

      if (currentVersion.id !== input.storyboardVersionId) {
        throw new StoryboardReviewVersionConflictError(input.storyboardVersionId);
      }

      const createdAt = dependencies.clock.now();
      const review = createStoryboardReviewRecord({
        id: toStoryboardReviewId(project.id, "approve", createdAt),
        projectId: project.id,
        storyboardVersionId: currentVersion.id,
        action: "approve",
        note: input.note,
        createdAt,
      });

      await dependencies.storyboardReviewRepository.insert(review);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_approved",
        updatedAt: createdAt,
      });

      return review;
    },
  };
}

function toStoryboardReviewId(
  projectId: string,
  action: "approve" | "reject",
  createdAt: string,
) {
  return `sbr_${projectId.replace(/^proj_/, "")}_${action}_${createdAt.replace(/\W/g, "")}`;
}
