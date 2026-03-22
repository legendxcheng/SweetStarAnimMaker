import type { RejectMasterPlotRequest, TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import type { CreateMasterPlotGenerateTaskUseCase } from "./create-master-plot-generate-task";

export interface RejectMasterPlotInput extends RejectMasterPlotRequest {
  projectId: string;
}

export interface RejectMasterPlotUseCase {
  execute(input: RejectMasterPlotInput): Promise<TaskDetail>;
}

export interface RejectMasterPlotUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  createMasterPlotGenerateTask: CreateMasterPlotGenerateTaskUseCase;
}

export function createRejectMasterPlotUseCase(
  dependencies: RejectMasterPlotUseCaseDependencies,
): RejectMasterPlotUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentMasterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
        storageDir: project.storageDir,
      });

      if (!currentMasterPlot) {
        throw new CurrentMasterPlotNotFoundError(project.id);
      }

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "premise_ready",
        updatedAt: currentMasterPlot.updatedAt,
      });

      return dependencies.createMasterPlotGenerateTask.execute({
        projectId: project.id,
      });
    },
  };
}
