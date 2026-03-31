import type { FinalCutResponse } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";

export interface GetFinalCutInput {
  projectId: string;
}

export interface GetFinalCutUseCase {
  execute(input: GetFinalCutInput): Promise<FinalCutResponse>;
}

export interface GetFinalCutUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
}

export function createGetFinalCutUseCase(
  dependencies: GetFinalCutUseCaseDependencies,
): GetFinalCutUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const finalCut = await dependencies.videoRepository.findCurrentFinalCutByProjectId?.(project.id);

      return {
        currentFinalCut: finalCut ?? null,
      };
    },
  };
}
