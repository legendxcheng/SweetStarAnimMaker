import type { ProjectSummary } from "@sweet-star/shared";

import { toCurrentCharacterSheetBatchSummary } from "../domain/character-sheet";
import { toCurrentSceneSheetBatchSummary } from "../domain/scene-sheet";
import { toCurrentShotScriptSummary } from "../domain/shot-script";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import {
  toCompatibleCurrentImageBatch,
  toCompatibleCurrentVideoBatchSummary,
} from "./project-batch-summary-compat";
import { toProjectSummaryDto } from "./project-summary-dto";

export interface ListProjectsUseCase {
  execute(): Promise<ProjectSummary[]>;
}

export interface ListProjectsUseCaseDependencies {
  repository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
  shotScriptStorage: ShotScriptStorage;
  characterSheetRepository: CharacterSheetRepository;
  sceneSheetRepository?: SceneSheetRepository;
  shotImageRepository: ShotImageRepository;
  videoRepository: VideoRepository;
}

export function createListProjectsUseCase(
  dependencies: ListProjectsUseCaseDependencies,
): ListProjectsUseCase {
  return {
    async execute() {
      const projects = await dependencies.repository.listAll();

      const summaries = await Promise.all(
        projects.map(async (project) => {
          const currentMasterPlot = project.currentMasterPlotId
            ? await dependencies.masterPlotStorage.readCurrentMasterPlot({
                storageDir: project.storageDir,
              })
            : null;
          const currentStoryboard = project.currentStoryboardId
            ? await dependencies.storyboardStorage.readCurrentStoryboard({
                storageDir: project.storageDir,
              })
            : null;
          const currentShotScript = project.currentShotScriptId
            ? await dependencies.shotScriptStorage.readCurrentShotScript({
                storageDir: project.storageDir,
              })
            : null;
          let currentCharacterSheetBatch = null;
          let currentSceneSheetBatch = null;
          let currentImageBatch = null;
          let currentVideoBatch = null;

          if (project.currentCharacterSheetBatchId) {
            const batch = await dependencies.characterSheetRepository.findBatchById(
              project.currentCharacterSheetBatchId,
            );

            if (batch) {
              const characters = await dependencies.characterSheetRepository.listCharactersByBatchId(
                batch.id,
              );
              currentCharacterSheetBatch = toCurrentCharacterSheetBatchSummary(batch, characters);
            }
          }

          if (project.currentSceneSheetBatchId && dependencies.sceneSheetRepository) {
            const batch = await dependencies.sceneSheetRepository.findBatchById(
              project.currentSceneSheetBatchId,
            );

            if (batch) {
              const scenes = await dependencies.sceneSheetRepository.listScenesByBatchId(batch.id);
              currentSceneSheetBatch = toCurrentSceneSheetBatchSummary(batch, scenes);
            }
          }

          if (project.currentImageBatchId) {
            const batch = await dependencies.shotImageRepository.findBatchById(
              project.currentImageBatchId,
            );

            if (batch) {
              const segments = dependencies.shotImageRepository.listSegmentsByBatchId
                ? await dependencies.shotImageRepository.listSegmentsByBatchId(batch.id)
                : dependencies.shotImageRepository.listShotsByBatchId
                  ? await dependencies.shotImageRepository.listShotsByBatchId(batch.id)
                : null;
              const records =
                segments ?? (await dependencies.shotImageRepository.listFramesByBatchId(batch.id));
              currentImageBatch = toCompatibleCurrentImageBatch(batch, records);
            }
          }
          if (project.currentVideoBatchId) {
            const batch = await dependencies.videoRepository.findBatchById(
              project.currentVideoBatchId,
            );

            if (batch) {
              const segments = await dependencies.videoRepository.listSegmentsByBatchId(batch.id);
              currentVideoBatch = toCompatibleCurrentVideoBatchSummary(batch, segments);
            }
          }
          return toProjectSummaryDto(
            project,
            currentMasterPlot,
            currentCharacterSheetBatch,
            currentSceneSheetBatch,
            currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
            currentShotScript ? toCurrentShotScriptSummary(currentShotScript) : null,
            currentImageBatch,
            currentVideoBatch,
          );
        }),
      );

      return summaries;
    },
  };
}
