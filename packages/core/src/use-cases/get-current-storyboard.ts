import type { CurrentStoryboard } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";

export interface GetCurrentStoryboardInput {
  projectId: string;
}

export interface GetCurrentStoryboardUseCase {
  execute(input: GetCurrentStoryboardInput): Promise<CurrentStoryboard>;
}

export interface GetCurrentStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
}

export function createGetCurrentStoryboardUseCase(
  dependencies: GetCurrentStoryboardUseCaseDependencies,
): GetCurrentStoryboardUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const storyboard = await dependencies.storyboardStorage.readCurrentStoryboard({
        storageDir: project.storageDir,
      });

      if (!storyboard) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      return storyboard;
    },
  };
}
