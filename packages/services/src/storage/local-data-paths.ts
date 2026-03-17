import path from "node:path";

import {
  originalScriptRelPath,
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
  projectPath(storageDir: string): string;
  projectOriginalScriptPath(storageDir: string): string;
  projectTaskInputPath(taskStorageDir: string): string;
  projectTaskOutputPath(taskStorageDir: string): string;
  projectTaskLogPath(taskStorageDir: string): string;
  projectStoryboardRawResponsePath(projectStorageDir: string, rawResponseRelPath: string): string;
  projectStoryboardVersionPath(projectStorageDir: string, versionRelPath: string): string;
}

export function createLocalDataPaths(workspaceRoot: string): LocalDataPaths {
  const dataRootDir = path.join(workspaceRoot, ".local-data");
  const sqliteDir = path.join(dataRootDir, "sqlite");
  const projectsDir = path.join(dataRootDir, "projects");

  return {
    workspaceRoot,
    dataRootDir,
    sqliteDir,
    sqliteDbPath: path.join(sqliteDir, "app.db"),
    projectsDir,
    projectPath(storageDir) {
      return path.join(dataRootDir, storageDir);
    },
    projectOriginalScriptPath(storageDir) {
      return path.join(dataRootDir, storageDir, originalScriptRelPath);
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
    projectStoryboardRawResponsePath(projectStorageDir, rawResponseRelPath) {
      return path.join(dataRootDir, projectStorageDir, rawResponseRelPath);
    },
    projectStoryboardVersionPath(projectStorageDir, versionRelPath) {
      return path.join(dataRootDir, projectStorageDir, versionRelPath);
    },
  };
}
