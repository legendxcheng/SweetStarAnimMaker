import type { TaskDetail } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { CreateMasterPlotGenerateTaskUseCase } from "./create-master-plot-generate-task";

export interface RegenerateMasterPlotInput {
  projectId: string;
}

export interface RegenerateMasterPlotUseCase {
  execute(input: RegenerateMasterPlotInput): Promise<TaskDetail>;
}

export interface RegenerateMasterPlotUseCaseDependencies {
  projectRepository: ProjectRepository;
  createMasterPlotGenerateTask: CreateMasterPlotGenerateTaskUseCase;
  clock: Clock;
}

export function createRegenerateMasterPlotUseCase(
  dependencies: RegenerateMasterPlotUseCaseDependencies,
): RegenerateMasterPlotUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const timestamp = dependencies.clock.now();
      await dependencies.projectRepository.updateCurrentMasterPlot({
        projectId: project.id,
        masterPlotId: null,
      });
      await dependencies.projectRepository.updateCurrentCharacterSheetBatch({
        projectId: project.id,
        batchId: null,
      });
      await dependencies.projectRepository.updateCurrentStoryboard({
        projectId: project.id,
        storyboardId: null,
      });
      await dependencies.projectRepository.updateCurrentShotScript({
        projectId: project.id,
        shotScriptId: null,
      });
      await dependencies.projectRepository.updateCurrentImageBatch({
        projectId: project.id,
        batchId: null,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: "premise_ready",
        updatedAt: timestamp,
      });

      return dependencies.createMasterPlotGenerateTask.execute({
        projectId: project.id,
      });
    },
  };
}
