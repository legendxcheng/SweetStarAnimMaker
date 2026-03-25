import fs from "node:fs/promises";
import path from "node:path";

import { ProjectNotFoundError } from "../errors/project-errors";
import { ShotImageNotFoundError } from "../errors/shot-image-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";

export interface GetImageFrameContentInput {
  projectId: string;
  frameId: string;
}

export interface ImageFrameContent {
  filePath: string;
  fileName: string;
  mimeType: string;
}

export interface GetImageFrameContentUseCase {
  execute(input: GetImageFrameContentInput): Promise<ImageFrameContent>;
}

export interface GetImageFrameContentUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageRepository: ShotImageRepository;
  shotImageStorage: ShotImageStorage;
}

export function createGetImageFrameContentUseCase(
  dependencies: GetImageFrameContentUseCaseDependencies,
): GetImageFrameContentUseCase {
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

      if (!frame.imageAssetPath) {
        throw new Error(`Image frame ${input.frameId} does not have an image asset`);
      }

      const filePath = await dependencies.shotImageStorage.resolveProjectAssetPath({
        projectStorageDir: project.storageDir,
        assetRelPath: frame.imageAssetPath,
      });

      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Image file not found: ${filePath}`);
      }

      let mimeType = "application/octet-stream";
      if (filePath.endsWith(".png")) mimeType = "image/png";
      else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (filePath.endsWith(".webp")) mimeType = "image/webp";

      return {
        filePath,
        fileName: path.basename(filePath),
        mimeType,
      };
    },
  };
}
