import {
  toShotScriptSegmentStorageKey,
  type CurrentShotScript,
  type SaveShotScriptSegmentRequest,
} from "@sweet-star/shared";

import {
  mergeShotScriptSegment,
  toEditedShotScriptSegment,
} from "../domain/shot-script";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import { resolveShotScriptSegment } from "./resolve-shot-script-segment";

export interface SaveHumanShotScriptSegmentInput extends SaveShotScriptSegmentRequest {
  projectId: string;
  segmentId: string;
}

export interface SaveHumanShotScriptSegmentUseCase {
  execute(input: SaveHumanShotScriptSegmentInput): Promise<CurrentShotScript>;
}

export interface SaveHumanShotScriptSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  clock: Clock;
}

export function createSaveHumanShotScriptSegmentUseCase(
  dependencies: SaveHumanShotScriptSegmentUseCaseDependencies,
): SaveHumanShotScriptSegmentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!currentShotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const { segment: currentSegment } = resolveShotScriptSegment(
        currentShotScript.segments,
        input.segmentId,
      );

      const updatedAt = dependencies.clock.now();
      const updatedShotScript = mergeShotScriptSegment(
        currentShotScript,
        toEditedShotScriptSegment({
          baseSegment: currentSegment,
          name: input.name,
          summary: input.summary,
          durationSec: input.durationSec,
          shots: input.shots,
        }),
        updatedAt,
      );

      await dependencies.shotScriptStorage.writeShotScriptVersion({
        storageDir: project.storageDir,
        versionId: toHumanShotScriptVersionId(updatedAt, currentSegment),
        kind: "human",
        shotScript: updatedShotScript,
      });
      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript: updatedShotScript,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: updatedShotScript.approvedAt ? "shot_script_approved" : "shot_script_in_review",
        updatedAt,
      });

      return updatedShotScript;
    },
  };
}

function toHumanShotScriptVersionId(
  updatedAt: string,
  segment: { sceneId: string; segmentId: string },
) {
  return `human-${toShotScriptSegmentStorageKey(segment)}-${updatedAt.replaceAll(/[:.]/g, "-")}`;
}
