import path from "node:path";

import {
  currentStoryboardJsonRelPath,
  currentStoryboardMarkdownRelPath,
  premiseRelPath,
  taskInputFileName,
  taskLogFileName,
  taskOutputFileName,
} from "@sweet-star/core";

export interface LocalDataPaths {
  workspaceRoot: string;
  dataRootDir: string;
  sqliteDir: string;
  sqliteDbPath: string;
  projectsDir: string;
  globalPromptTemplatesDir: string;
  globalPromptTemplatePath(promptTemplateKey: string): string;
  projectPath(storageDir: string): string;
  projectPremisePath(storageDir: string): string;
  projectTaskInputPath(taskStorageDir: string): string;
  projectTaskOutputPath(taskStorageDir: string): string;
  projectTaskLogPath(taskStorageDir: string): string;
  projectStoryboardCurrentJsonPath(projectStorageDir: string): string;
  projectStoryboardCurrentMarkdownPath(projectStorageDir: string): string;
  projectStoryboardRawResponsePath(projectStorageDir: string, rawResponseRelPath: string): string;
  projectStoryboardVersionPath(projectStorageDir: string, versionRelPath: string): string;
  projectCharacterSheetBatchManifestPath(projectStorageDir: string, manifestRelPath: string): string;
  projectCharacterSheetAssetPath(projectStorageDir: string, assetRelPath: string): string;
  projectSceneSheetAssetPath(projectStorageDir: string, assetRelPath: string): string;
}

export function createLocalDataPaths(workspaceRoot: string): LocalDataPaths {
  const dataRootDir = path.join(workspaceRoot, ".local-data");
  const sqliteDir = path.join(dataRootDir, "sqlite");
  const projectsDir = path.join(dataRootDir, "projects");
  const globalPromptTemplatesDir = path.join(workspaceRoot, "prompt-templates");

  return {
    workspaceRoot,
    dataRootDir,
    sqliteDir,
    sqliteDbPath: path.join(sqliteDir, "app.db"),
    projectsDir,
    globalPromptTemplatesDir,
    globalPromptTemplatePath(promptTemplateKey) {
      return path.join(globalPromptTemplatesDir, `${promptTemplateKey}.txt`);
    },
    projectPath(storageDir) {
      return path.join(dataRootDir, storageDir);
    },
    projectPremisePath(storageDir) {
      return path.join(dataRootDir, storageDir, premiseRelPath);
    },
    projectTaskInputPath(taskStorageDir) {
      return path.join(dataRootDir, taskStorageDir, taskInputFileName);
    },
    projectTaskOutputPath(taskStorageDir) {
      return path.join(dataRootDir, taskStorageDir, taskOutputFileName);
    },
    projectTaskLogPath(taskStorageDir) {
      return path.join(dataRootDir, taskStorageDir, taskLogFileName);
    },
    projectStoryboardCurrentJsonPath(projectStorageDir) {
      return path.join(dataRootDir, projectStorageDir, currentStoryboardJsonRelPath);
    },
    projectStoryboardCurrentMarkdownPath(projectStorageDir) {
      return path.join(dataRootDir, projectStorageDir, currentStoryboardMarkdownRelPath);
    },
    projectStoryboardRawResponsePath(projectStorageDir, rawResponseRelPath) {
      return path.join(dataRootDir, projectStorageDir, rawResponseRelPath);
    },
    projectStoryboardVersionPath(projectStorageDir, versionRelPath) {
      return path.join(dataRootDir, projectStorageDir, versionRelPath);
    },
    projectCharacterSheetBatchManifestPath(projectStorageDir, manifestRelPath) {
      return path.join(dataRootDir, projectStorageDir, manifestRelPath);
    },
    projectCharacterSheetAssetPath(projectStorageDir, assetRelPath) {
      return path.join(dataRootDir, projectStorageDir, assetRelPath);
    },
    projectSceneSheetAssetPath(projectStorageDir, assetRelPath) {
      return path.join(dataRootDir, projectStorageDir, assetRelPath);
    },
  };
}
