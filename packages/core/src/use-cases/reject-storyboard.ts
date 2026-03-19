import type { MasterPlotReviewSummary, RejectMasterPlotRequest } from "@sweet-star/shared";

import { createStoryboardReviewRecord } from "../domain/storyboard-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { CreateStoryboardGenerateTaskUseCase } from "./create-storyboard-generate-task";

export interface RejectStoryboardInput extends RejectMasterPlotRequest {
  projectId: string;
}

export interface RejectStoryboardUseCase {
  execute(input: RejectStoryboardInput): Promise<MasterPlotReviewSummary>;
}

export interface RejectStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardReviewRepository: StoryboardReviewRepository;
  createStoryboardGenerateTask: CreateStoryboardGenerateTaskUseCase;
  clock: Clock;
}

export function createRejectStoryboardUseCase(
  dependencies: RejectStoryboardUseCaseDependencies,
): RejectStoryboardUseCase {
  return {
    async execute(input) {
      const reason = requireRejectReason(input.reason);
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentMasterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
        storageDir: project.storageDir,
      });

      if (!currentMasterPlot) {
        throw new CurrentMasterPlotNotFoundError(project.id);
      }

      const createdAt = dependencies.clock.now();
      const triggeredTaskId = (
        await dependencies.createStoryboardGenerateTask.execute({
          projectId: project.id,
        })
      ).id;
      const review = createStoryboardReviewRecord({
        id: toStoryboardReviewId(project.id, createdAt),
        projectId: project.id,
        masterPlotId: currentMasterPlot.id,
        action: "reject",
        reason,
        triggeredTaskId,
        createdAt,
      });

      await dependencies.storyboardReviewRepository.insert(review);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "master_plot_generating",
        updatedAt: createdAt,
      });

      return review;
    },
  };
}

function toStoryboardReviewId(projectId: string, createdAt: string) {
  return `sbr_${projectId.replace(/^proj_/, "")}_reject_${createdAt.replace(/\W/g, "")}`;
}

function requireRejectReason(reason: string) {
  const trimmed = reason.trim();

  if (!trimmed) {
    createStoryboardReviewRecord({
      id: "unused",
      projectId: "unused",
      masterPlotId: "unused",
      action: "reject",
      reason,
      createdAt: "unused",
    });
  }

  return trimmed;
}
