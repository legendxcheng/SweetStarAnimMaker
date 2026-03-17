import path from "node:path";

import { originalScriptRelPath } from "@sweet-star/core";

export interface LocalDataPaths {
  workspaceRoot: string;
  dataRootDir: string;
  sqliteDir: string;
  sqliteDbPath: string;
  projectsDir: string;
  projectPath(storageDir: string): string;
  projectOriginalScriptPath(storageDir: string): string;
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
  };
}
