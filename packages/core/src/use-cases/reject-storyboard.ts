import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { CreateStoryboardGenerateTaskUseCase } from "./create-storyboard-generate-task";

export interface RejectStoryboardInput {
  projectId: string;
}

export interface RejectStoryboardUseCase {
  execute(input: RejectStoryboardInput): Promise<TaskDetail>;
}

export interface RejectStoryboardUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  createStoryboardGenerateTask: CreateStoryboardGenerateTaskUseCase;
}

export function createRejectStoryboardUseCase(
  dependencies: RejectStoryboardUseCaseDependencies,
): RejectStoryboardUseCase {
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

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "character_sheets_approved",
        updatedAt: currentStoryboard.updatedAt,
      });

      const task = await dependencies.createStoryboardGenerateTask.execute({
        projectId: project.id,
      });

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_generating",
        updatedAt: task.updatedAt,
      });

      return task;
    },
  };
}
