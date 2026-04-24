import type {
  SegmentFrameRecord,
  ShotReferenceFrame,
  UpdateImageFramePromptRequest,
} from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import { hydrateFrameWithPlanningSceneMetadata } from "./frame-planning-scene-metadata";
import { resolveShotFrameRecord } from "./shot-reference-frame-helpers";

export interface UpdateFramePromptInput extends UpdateImageFramePromptRequest {
  projectId: string;
  frameId: string;
}

export interface UpdateFramePromptUseCase {
  execute(input: UpdateFramePromptInput): Promise<SegmentFrameRecord | ShotReferenceFrame>;
}

export interface UpdateFramePromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  sceneSheetRepository?: SceneSheetRepository;
  shotImageRepository: ShotImageRepository;
  shotImageStorage?: ShotImageStorage;
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

      const resolvedShotFrame = project.currentImageBatchId
        ? await resolveShotFrameRecord({
            repository: dependencies.shotImageRepository,
            batchId: project.currentImageBatchId,
            frameId: input.frameId,
          })
        : null;
      const frame =
        resolvedShotFrame?.frame ??
        (await dependencies.shotImageRepository.findFrameById(input.frameId));

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

      return hydrateFrameWithPlanningSceneMetadata(updatedFrame, {
        shotImageStorage: dependencies.shotImageStorage,
        sceneSheetRepository: dependencies.sceneSheetRepository,
      });
    },
  };
}
