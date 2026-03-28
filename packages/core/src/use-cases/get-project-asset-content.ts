import fs from "node:fs/promises";
import path from "node:path";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";

export interface GetProjectAssetContentInput {
  projectId: string;
  assetRelPath: string;
}

export interface ProjectAssetContent {
  filePath: string;
  fileName: string;
  mimeType: string;
}

export interface GetProjectAssetContentUseCase {
  execute(input: GetProjectAssetContentInput): Promise<ProjectAssetContent>;
}

export interface GetProjectAssetContentUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotImageStorage: ShotImageStorage;
}

export function createGetProjectAssetContentUseCase(
  dependencies: GetProjectAssetContentUseCaseDependencies,
): GetProjectAssetContentUseCase {
  return {
    async execute(input) {
      if (input.assetRelPath.includes("..")) {
        throw new Error("Invalid asset path");
      }

      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const filePath = await dependencies.shotImageStorage.resolveProjectAssetPath({
        projectStorageDir: project.storageDir,
        assetRelPath: input.assetRelPath,
      });

      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Asset file not found: ${filePath}`);
      }

      let mimeType = "application/octet-stream";
      if (filePath.endsWith(".png")) mimeType = "image/png";
      else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (filePath.endsWith(".webp")) mimeType = "image/webp";
      else if (filePath.endsWith(".mp4")) mimeType = "video/mp4";

      return {
        filePath,
        fileName: path.basename(filePath),
        mimeType,
      };
    },
  };
}
