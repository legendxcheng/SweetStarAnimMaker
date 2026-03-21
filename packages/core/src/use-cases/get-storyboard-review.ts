import type { StoryboardReviewWorkspace } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { TaskRepository } from "../ports/task-repository";
import { toTaskDetailDto } from "./task-detail-dto";

export interface GetStoryboardReviewInput {
  projectId: string;
}

export interface GetStoryboardReviewUseCase {
  execute(input: GetStoryboardReviewInput): Promise<StoryboardReviewWorkspace>;
}

export interface GetStoryboardReviewUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardStorage: StoryboardStorage;
  taskRepository: TaskRepository;
}

export function createGetStoryboardReviewUseCase(
  dependencies: GetStoryboardReviewUseCaseDependencies,
): GetStoryboardReviewUseCase {
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

      const latestTask = await dependencies.taskRepository.findLatestByProjectId(
        project.id,
        "storyboard_generate",
      );

      return {
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        currentStoryboard,
        availableActions: {
          save: project.status === "storyboard_in_review",
          approve: project.status === "storyboard_in_review",
          reject: project.status === "storyboard_in_review",
        },
        latestTask: latestTask ? toTaskDetailDto(latestTask) : null,
      };
    },
  };
}
