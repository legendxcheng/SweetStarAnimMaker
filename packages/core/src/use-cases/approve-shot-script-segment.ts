import {
  toShotScriptSegmentStorageKey,
  type CurrentShotScript,
} from "@sweet-star/shared";

import {
  mergeShotScriptSegment,
  toApprovedShotScriptSegment,
} from "../domain/shot-script";
import {
  createShotScriptReviewId,
  createShotScriptReviewRecord,
} from "../domain/shot-script-review";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import { resolveShotScriptSegment } from "./resolve-shot-script-segment";

export interface ApproveShotScriptSegmentInput {
  projectId: string;
  segmentId: string;
}

export interface ApproveShotScriptSegmentUseCase {
  execute(input: ApproveShotScriptSegmentInput): Promise<CurrentShotScript>;
}

export interface ApproveShotScriptSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  clock: Clock;
}

export function createApproveShotScriptSegmentUseCase(
  dependencies: ApproveShotScriptSegmentUseCaseDependencies,
): ApproveShotScriptSegmentUseCase {
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

      const approvedAt = dependencies.clock.now();
      const updatedShotScript = mergeShotScriptSegment(
        currentShotScript,
        toApprovedShotScriptSegment(currentSegment, approvedAt),
        approvedAt,
      );

      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript: updatedShotScript,
      });
      await dependencies.shotScriptReviewRepository.insert(
        createShotScriptReviewRecord({
          id: createShotScriptReviewId(
            currentShotScript.id,
            toShotScriptSegmentStorageKey(currentSegment),
            "approve",
          ),
          projectId: project.id,
          shotScriptId: currentShotScript.id,
          action: "approve",
          reason: null,
          nextAction: null,
          createdAt: approvedAt,
        }),
      );
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: updatedShotScript.approvedAt ? "shot_script_approved" : "shot_script_in_review",
        updatedAt: approvedAt,
      });

      return updatedShotScript;
    },
  };
}
