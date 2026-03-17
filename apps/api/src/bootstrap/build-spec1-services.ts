import crypto from "node:crypto";

import {
  createCreateProjectUseCase,
  createGetProjectDetailUseCase,
  createUpdateProjectScriptUseCase,
} from "@sweet-star/core";
import {
  createFileScriptStorage,
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  initializeSqliteSchema,
} from "@sweet-star/services";

export interface BuildSpec1ServicesOptions {
  workspaceRoot: string;
}

export function buildSpec1Services(options: BuildSpec1ServicesOptions) {
  const paths = createLocalDataPaths(options.workspaceRoot);
  const db = createSqliteDb({ paths });

  initializeSqliteSchema(db);

  const repository = createSqliteProjectRepository({ db });
  const scriptStorage = createFileScriptStorage({ paths });
  const clock = {
    now: () => new Date().toISOString(),
  };

  return {
    db,
    createProject: createCreateProjectUseCase({
      repository,
      scriptStorage,
      idGenerator: {
        generateProjectId: () => {
          const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
          const randomPart = crypto.randomBytes(3).toString("hex");

          return `proj_${datePart}_${randomPart}`;
        },
      },
      clock,
    }),
    getProjectDetail: createGetProjectDetailUseCase({
      repository,
    }),
    updateProjectScript: createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock,
    }),
  };
}
