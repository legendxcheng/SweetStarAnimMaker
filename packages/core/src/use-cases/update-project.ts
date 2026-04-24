import type { ProjectDetail, UpdateProjectRequest } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import { toProjectDetailDto } from "./project-detail-dto";

export interface UpdateProjectInput extends UpdateProjectRequest {
  projectId: string;
}

export interface UpdateProjectUseCase {
  execute(input: UpdateProjectInput): Promise<ProjectDetail>;
}

export interface UpdateProjectUseCaseDependencies {
  repository: ProjectRepository;
  clock: Clock;
}

export function createUpdateProjectUseCase(
  dependencies: UpdateProjectUseCaseDependencies,
): UpdateProjectUseCase {
  return {
    async execute(input) {
      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const updatedAt = dependencies.clock.now();

      await dependencies.repository.updateSettings?.({
        projectId: project.id,
        updatedAt,
        videoReferenceStrategy: input.videoReferenceStrategy,
      });

      return toProjectDetailDto(
        {
          ...project,
          videoReferenceStrategy:
            input.videoReferenceStrategy ?? project.videoReferenceStrategy,
          updatedAt,
        },
        null,
        null,
        null,
        null,
        "",
        project.visualStyleText,
      );
    },
  };
}
