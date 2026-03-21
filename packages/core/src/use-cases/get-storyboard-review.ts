import type { MasterPlotReviewWorkspace } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardReviewRepository } from "../ports/storyboard-review-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetStoryboardReviewInput {
  projectId: string;
}

export interface GetStoryboardReviewUseCase {
  execute(input: GetStoryboardReviewInput): Promise<MasterPlotReviewWorkspace>;
}

export interface GetStoryboardReviewUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
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

      const currentMasterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
        storageDir: project.storageDir,
      });

      if (!currentMasterPlot) {
        throw new CurrentMasterPlotNotFoundError(project.id);
      }

      const latestReview = await dependencies.storyboardReviewRepository.findLatestByProjectId(
        project.id,
      );
      const latestTask = await dependencies.taskRepository.findLatestByProjectId(
        project.id,
        "master_plot_generate",
      );

      return {
        projectId: project.id,
        projectStatus: project.status,
        currentMasterPlot,
        latestReview,
        availableActions: {
          save: project.status === "master_plot_in_review",
          approve: project.status === "master_plot_in_review",
          reject: project.status === "master_plot_in_review",
        },
        latestTask: latestTask ? toTaskDetailDto(latestTask) : null,
      };
    },
  };
}
