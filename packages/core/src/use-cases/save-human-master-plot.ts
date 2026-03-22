import type { CurrentMasterPlot, SaveMasterPlotRequest } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";

export interface SaveHumanMasterPlotInput extends SaveMasterPlotRequest {
  projectId: string;
}

export interface SaveHumanMasterPlotUseCase {
  execute(input: SaveHumanMasterPlotInput): Promise<CurrentMasterPlot>;
}

export interface SaveHumanMasterPlotUseCaseDependencies {
  projectRepository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  clock: Clock;
}

export function createSaveHumanMasterPlotUseCase(
  dependencies: SaveHumanMasterPlotUseCaseDependencies,
): SaveHumanMasterPlotUseCase {
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

      const updatedAt = dependencies.clock.now();
      const masterPlot: CurrentMasterPlot = {
        id: currentMasterPlot.id,
        title: input.title,
        logline: input.logline,
        synopsis: input.synopsis,
        mainCharacters: input.mainCharacters,
        coreConflict: input.coreConflict,
        emotionalArc: input.emotionalArc,
        endingBeat: input.endingBeat,
        targetDurationSec: input.targetDurationSec,
        sourceTaskId: currentMasterPlot.sourceTaskId,
        updatedAt,
        approvedAt: null,
      };

      await dependencies.masterPlotStorage.writeCurrentMasterPlot({
        storageDir: project.storageDir,
        masterPlot,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "master_plot_in_review",
        updatedAt,
      });

      return masterPlot;
    },
  };
}
