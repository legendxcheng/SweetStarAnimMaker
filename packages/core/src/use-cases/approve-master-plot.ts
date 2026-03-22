import type { ApproveMasterPlotRequest, CurrentMasterPlot } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";

export interface ApproveMasterPlotInput extends ApproveMasterPlotRequest {
  projectId: string;
}

export interface ApproveMasterPlotUseCase {
  execute(input: ApproveMasterPlotInput): Promise<CurrentMasterPlot>;
}

export interface ApproveMasterPlotUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  clock: Clock;
}

export function createApproveMasterPlotUseCase(
  dependencies: ApproveMasterPlotUseCaseDependencies,
): ApproveMasterPlotUseCase {
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

      const approvedAt = dependencies.clock.now();
      const masterPlot: CurrentMasterPlot = {
        ...currentMasterPlot,
        updatedAt: approvedAt,
        approvedAt,
      };

      await dependencies.masterPlotStorage.writeCurrentMasterPlot({
        storageDir: project.storageDir,
        masterPlot,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "master_plot_approved",
        updatedAt: approvedAt,
      });

      return masterPlot;
    },
  };
}
