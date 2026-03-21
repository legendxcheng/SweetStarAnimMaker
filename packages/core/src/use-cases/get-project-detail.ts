import type { ProjectDetail } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { toProjectDetailDto } from "./project-detail-dto";

export interface GetProjectDetailInput {
  projectId: string;
}

export interface GetProjectDetailUseCase {
  execute(input: GetProjectDetailInput): Promise<ProjectDetail>;
}

export interface GetProjectDetailUseCaseDependencies {
  repository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
}

export function createGetProjectDetailUseCase(
  dependencies: GetProjectDetailUseCaseDependencies,
): GetProjectDetailUseCase {
  return {
    async execute(input) {
      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentMasterPlot = project.currentMasterPlotId
        ? await dependencies.masterPlotStorage.readCurrentMasterPlot({
            storageDir: project.storageDir,
          })
        : null;
      const currentStoryboard = project.currentStoryboardId
        ? await dependencies.storyboardStorage.readCurrentStoryboard({
            storageDir: project.storageDir,
          })
        : null;

      return toProjectDetailDto(
        project,
        currentMasterPlot,
        currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
      );
    },
  };
}
