import type { CurrentStoryboard, SaveHumanStoryboardVersionRequest } from "@sweet-star/shared";

import { createStoryboardVersionRecord, toCurrentStoryboard } from "../domain/storyboard";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentStoryboardNotFoundError } from "../errors/storyboard-errors";
import { StoryboardReviewVersionConflictError } from "../errors/storyboard-review-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { StoryboardStorage } from "../ports/storyboard-storage";
import type { StoryboardVersionRepository } from "../ports/storyboard-version-repository";

export interface SaveHumanStoryboardVersionInput extends SaveHumanStoryboardVersionRequest {
  projectId: string;
}

export interface SaveHumanStoryboardVersionUseCase {
  execute(input: SaveHumanStoryboardVersionInput): Promise<CurrentStoryboard>;
}

export interface SaveHumanStoryboardVersionUseCaseDependencies {
  projectRepository: ProjectRepository;
  storyboardVersionRepository: StoryboardVersionRepository;
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

      const currentVersion = await dependencies.storyboardVersionRepository.findCurrentByProjectId(
        project.id,
      );

      if (!currentVersion) {
        throw new CurrentStoryboardNotFoundError(project.id);
      }

      if (currentVersion.id !== input.baseVersionId) {
        throw new StoryboardReviewVersionConflictError(input.baseVersionId);
      }

      const versionNumber =
        (await dependencies.storyboardVersionRepository.getNextVersionNumber?.(project.id)) ??
        currentVersion.versionNumber + 1;
      const createdAt = dependencies.clock.now();
      const version = createStoryboardVersionRecord({
        id: toHumanStoryboardVersionId(project.id, versionNumber),
        projectId: project.id,
        projectStorageDir: project.storageDir,
        sourceTaskId: currentVersion.sourceTaskId,
        versionNumber,
        provider: "manual",
        model: "manual-edit",
        createdAt,
        kind: "human",
      });
      const storyboard = {
        summary: input.summary,
        scenes: input.scenes,
      };

      await dependencies.storyboardStorage.writeStoryboardVersion({
        version,
        storyboard,
      });
      await dependencies.storyboardVersionRepository.insert(version);
      await dependencies.projectRepository.updateCurrentStoryboardVersion({
        projectId: project.id,
        storyboardVersionId: version.id,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "storyboard_in_review",
        updatedAt: createdAt,
      });

      return toCurrentStoryboard(version, storyboard);
    },
  };
}

function toHumanStoryboardVersionId(projectId: string, versionNumber: number) {
  return `sbv_${projectId.replace(/^proj_/, "")}_v${versionNumber}_human`;
}
