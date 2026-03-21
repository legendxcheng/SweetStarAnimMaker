import type { ProjectSummary } from "@sweet-star/shared";

import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { toProjectSummaryDto } from "./project-summary-dto";

export interface ListProjectsUseCase {
  execute(): Promise<ProjectSummary[]>;
}

export interface ListProjectsUseCaseDependencies {
  repository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
}

export function createListProjectsUseCase(
  dependencies: ListProjectsUseCaseDependencies,
): ListProjectsUseCase {
  return {
    async execute() {
      const projects = await dependencies.repository.listAll();

      const summaries = await Promise.all(
        projects.map(async (project) => {
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
          return toProjectSummaryDto(
            project,
            currentMasterPlot,
            currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
          );
        }),
      );

      return summaries;
    },
  };
}
