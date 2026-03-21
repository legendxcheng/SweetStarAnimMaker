import type { ApproveStoryboardRequest, CurrentStoryboard } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";

export interface ApproveStoryboardInput extends ApproveStoryboardRequest {
  projectId: string;
}

export interface ApproveStoryboardUseCase {
  execute(input: ApproveStoryboardInput): Promise<CurrentStoryboard>;
}

export interface ApproveStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  clock: Clock;
}

export function createApproveStoryboardUseCase(
  dependencies: ApproveStoryboardUseCaseDependencies,
): ApproveStoryboardUseCase {
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

      const approvedAt = dependencies.clock.now();
      const storyboard: CurrentStoryboard = {
        ...currentStoryboard,
        updatedAt: approvedAt,
        approvedAt,
      };

      await dependencies.storyboardStorage.writeCurrentStoryboard({
        storageDir: project.storageDir,
        storyboard,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_approved",
        updatedAt: approvedAt,
      });

      return storyboard;
    },
  };
}
