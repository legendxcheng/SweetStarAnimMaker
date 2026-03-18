import type { RejectStoryboardRequest, StoryboardReviewRecord } from "@sweet-star/shared";

import { createStoryboardReviewRecord } from "../domain/storyboard-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import { StoryboardReviewVersionConflictError } from "../errors/storyboard-review-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";
import type { CreateStoryboardGenerateTaskUseCase } from "./create-storyboard-generate-task";

export interface RejectStoryboardInput extends RejectStoryboardRequest {
  projectId: string;
}

export interface RejectStoryboardUseCase {
  execute(input: RejectStoryboardInput): Promise<StoryboardReviewRecord>;
}

export interface RejectStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
  storyboardReviewRepository: StoryboardReviewRepository;
  createStoryboardGenerateTask: CreateStoryboardGenerateTaskUseCase;
  clock: Clock;
}

export function createRejectStoryboardUseCase(
  dependencies: RejectStoryboardUseCaseDependencies,
): RejectStoryboardUseCase {
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
      const triggeredTaskId =
        input.nextAction === "regenerate"
          ? (
              await dependencies.createStoryboardGenerateTask.execute({
                projectId: project.id,
                reviewContext: {
                  reason: input.reason,
                  rejectedVersionId: currentVersion.id,
                },
              })
            ).id
          : null;
      const review = createStoryboardReviewRecord({
        id: toStoryboardReviewId(project.id, createdAt),
        projectId: project.id,
        storyboardVersionId: currentVersion.id,
        action: "reject",
        reason: input.reason,
        triggeredTaskId,
        createdAt,
      });

      await dependencies.storyboardReviewRepository.insert(review);

      if (input.nextAction === "edit_manually") {
        await dependencies.projectRepository.updateStatus({
          projectId: project.id,
          status: "storyboard_in_review",
          updatedAt: createdAt,
        });
      }

      return review;
    },
  };
}

function toStoryboardReviewId(projectId: string, createdAt: string) {
  return `sbr_${projectId.replace(/^proj_/, "")}_reject_${createdAt.replace(/\W/g, "")}`;
}
