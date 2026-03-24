import type { SegmentFrameRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface GetImageFrameInput {
  projectId: string;
  frameId: string;
}

export interface GetImageFrameUseCase {
  execute(input: GetImageFrameInput): Promise<SegmentFrameRecord>;
}

export interface GetImageFrameUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
}

export function createGetImageFrameUseCase(
  dependencies: GetImageFrameUseCaseDependencies,
): GetImageFrameUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const frame = await dependencies.shotImageRepository.findFrameById(input.frameId);

      if (!frame || frame.projectId !== project.id) {
        throw new ShotImageNotFoundError(input.frameId);
      }

      return frame;
    },
  };
}
