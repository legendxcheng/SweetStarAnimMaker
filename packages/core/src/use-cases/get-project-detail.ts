import type { ProjectDetail } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";
import { toProjectDetailDto } from "./project-detail-dto";

export interface GetProjectDetailInput {
  projectId: string;
}

export interface GetProjectDetailUseCase {
  execute(input: GetProjectDetailInput): Promise<ProjectDetail>;
}

export interface GetProjectDetailUseCaseDependencies {
  repository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
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

      const currentStoryboard =
        await dependencies.storyboardVersionRepository.findCurrentByProjectId(project.id);

      return toProjectDetailDto(project, currentStoryboard);
    },
  };
}
