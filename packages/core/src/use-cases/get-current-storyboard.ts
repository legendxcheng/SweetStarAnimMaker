import type { CurrentStoryboard } from "@sweet-star/shared";

import { toCurrentStoryboard } from "../domain/storyboard";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";

export interface GetCurrentStoryboardInput {
  projectId: string;
}

export interface GetCurrentStoryboardUseCase {
  execute(input: GetCurrentStoryboardInput): Promise<CurrentStoryboard>;
}

export interface GetCurrentStoryboardUseCaseDependencies {
  storyboardVersionRepository: StoryboardVersionRepository;
  storyboardStorage: StoryboardStorage;
}

export function createGetCurrentStoryboardUseCase(
  dependencies: GetCurrentStoryboardUseCaseDependencies,
): GetCurrentStoryboardUseCase {
  return {
    async execute(input) {
      const currentVersion = await dependencies.storyboardVersionRepository.findCurrentByProjectId(
        input.projectId,
      );

      if (!currentVersion) {
        throw new CurrentMasterPlotNotFoundError(input.projectId);
      }

      const storyboard = await dependencies.storyboardStorage.readStoryboardVersion({
        version: currentVersion,
      });

      return toCurrentStoryboard(currentVersion, storyboard);
    },
  };
}
