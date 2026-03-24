import type { SegmentFrameRecord, UpdateImageFramePromptRequest } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface UpdateFramePromptInput extends UpdateImageFramePromptRequest {
  projectId: string;
  frameId: string;
}

export interface UpdateFramePromptUseCase {
  execute(input: UpdateFramePromptInput): Promise<SegmentFrameRecord>;
}

export interface UpdateFramePromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  clock: Clock;
}

export function createUpdateFramePromptUseCase(
  dependencies: UpdateFramePromptUseCaseDependencies,
): UpdateFramePromptUseCase {
  return {
    async execute(input) {
      const promptTextCurrent = input.promptTextCurrent.trim();

      if (!promptTextCurrent) {
        throw new ProjectValidationError("Frame prompt is required");
      }

      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const frame = await dependencies.shotImageRepository.findFrameById(input.frameId);

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      const timestamp = dependencies.clock.now();
      const updatedFrame = {
        ...frame,
        promptTextCurrent,
        negativePromptTextCurrent: input.negativePromptTextCurrent?.trim() || null,
        promptUpdatedAt: timestamp,
        updatedAt: timestamp,
      };

      await dependencies.shotImageRepository.updateFrame(updatedFrame);

      return updatedFrame;
    },
  };
}
