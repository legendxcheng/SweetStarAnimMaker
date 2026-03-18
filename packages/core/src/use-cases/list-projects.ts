import type { ProjectSummary } from "@sweet-star/shared";

import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";
import { toProjectSummaryDto } from "./project-summary-dto";

export interface ListProjectsUseCase {
  execute(): Promise<ProjectSummary[]>;
}

export interface ListProjectsUseCaseDependencies {
  repository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
}

export function createListProjectsUseCase(
  dependencies: ListProjectsUseCaseDependencies,
): ListProjectsUseCase {
  return {
    async execute() {
      const projects = await dependencies.repository.listAll();

      const summaries = await Promise.all(
        projects.map(async (project) => {
          const currentStoryboard =
            await dependencies.storyboardVersionRepository.findCurrentByProjectId(project.id);
          return toProjectSummaryDto(project, currentStoryboard);
        }),
      );

      return summaries;
    },
  };
}
