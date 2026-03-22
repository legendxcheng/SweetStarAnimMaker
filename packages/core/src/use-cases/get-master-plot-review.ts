import type { MasterPlotReviewWorkspace } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetMasterPlotReviewInput {
  projectId: string;
}

export interface GetMasterPlotReviewUseCase {
  execute(input: GetMasterPlotReviewInput): Promise<MasterPlotReviewWorkspace>;
}

export interface GetMasterPlotReviewUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  taskRepository: TaskRepository;
}

export function createGetMasterPlotReviewUseCase(
  dependencies: GetMasterPlotReviewUseCaseDependencies,
): GetMasterPlotReviewUseCase {
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

      const latestTask = await dependencies.taskRepository.findLatestByProjectId(
        project.id,
        "master_plot_generate",
      );

      return {
        projectId: project.id,
        projectStatus: project.status,
        currentMasterPlot,
        latestReview: null,
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
