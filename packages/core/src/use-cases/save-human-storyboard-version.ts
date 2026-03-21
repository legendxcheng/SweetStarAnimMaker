import type { CurrentStoryboard, SaveStoryboardRequest } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";

export interface SaveHumanStoryboardVersionInput extends SaveStoryboardRequest {
  projectId: string;
}

export interface SaveHumanStoryboardVersionUseCase {
  execute(input: SaveHumanStoryboardVersionInput): Promise<CurrentStoryboard>;
}

export interface SaveHumanStoryboardVersionUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  clock: Clock;
}

export function createSaveHumanStoryboardVersionUseCase(
  dependencies: SaveHumanStoryboardVersionUseCaseDependencies,
): SaveHumanStoryboardVersionUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentStoryboard = await dependencies.storyboardStorage.readCurrentStoryboard({
        storageDir: project.storageDir,
      });

      if (!currentStoryboard) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      const updatedAt = dependencies.clock.now();
      const storyboard: CurrentStoryboard = {
        id: currentStoryboard.id,
        title: input.title,
        episodeTitle: input.episodeTitle,
        sourceMasterPlotId: input.sourceMasterPlotId,
        sourceTaskId: input.sourceTaskId,
        updatedAt,
        approvedAt: null,
        scenes: input.scenes,
      };

      await dependencies.storyboardStorage.writeCurrentStoryboard({
        storageDir: project.storageDir,
        storyboard,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_in_review",
        updatedAt,
      });

      return storyboard;
    },
  };
}
