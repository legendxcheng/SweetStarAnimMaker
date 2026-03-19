import type { ApproveMasterPlotRequest, MasterPlotReviewSummary } from "@sweet-star/shared";

import { createStoryboardReviewRecord } from "../domain/storyboard-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";

export interface ApproveStoryboardInput extends ApproveMasterPlotRequest {
  projectId: string;
}

export interface ApproveStoryboardUseCase {
  execute(input: ApproveStoryboardInput): Promise<MasterPlotReviewSummary>;
}

export interface ApproveStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
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

      const currentMasterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
        storageDir: project.storageDir,
      });

      if (!currentMasterPlot) {
        throw new CurrentMasterPlotNotFoundError(project.id);
      }

      const createdAt = dependencies.clock.now();

      await dependencies.masterPlotStorage.writeCurrentMasterPlot({
        storageDir: project.storageDir,
        masterPlot: {
          ...currentMasterPlot,
          updatedAt: createdAt,
          approvedAt: createdAt,
        },
      });

      const review = createStoryboardReviewRecord({
        id: toStoryboardReviewId(project.id, "approve", createdAt),
        projectId: project.id,
        masterPlotId: currentMasterPlot.id,
        action: "approve",
        createdAt,
      });

      await dependencies.storyboardReviewRepository.insert(review);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "master_plot_approved",
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
