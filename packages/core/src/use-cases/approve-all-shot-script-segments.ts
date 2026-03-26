import type { CurrentShotScript } from "@sweet-star/shared";
import { toShotScriptSegmentSelector } from "@sweet-star/shared";

import { mergeShotScriptSegment, toApprovedShotScriptSegment } from "../domain/shot-script";
import {
  createShotScriptReviewId,
  createShotScriptReviewRecord,
} from "../domain/shot-script-review";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptReviewRepository } from "../ports/shot-script-review-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";

export interface ApproveAllShotScriptSegmentsInput {
  projectId: string;
}

export interface ApproveAllShotScriptSegmentsUseCase {
  execute(input: ApproveAllShotScriptSegmentsInput): Promise<CurrentShotScript>;
}

export interface ApproveAllShotScriptSegmentsUseCaseDependencies {
  projectRepository: ProjectRepository;
  shotScriptStorage: ShotScriptStorage;
  shotScriptReviewRepository: ShotScriptReviewRepository;
  clock: Clock;
}

export function createApproveAllShotScriptSegmentsUseCase(
  dependencies: ApproveAllShotScriptSegmentsUseCaseDependencies,
): ApproveAllShotScriptSegmentsUseCase {
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

      const incompleteSegment = currentShotScript.segments.find(
        (segment) => segment.status === "pending" || segment.shots.length === 0,
      );

      if (incompleteSegment) {
        throw new ProjectValidationError(
          `Shot script approve-all requires a complete draft before approval: ${toShotScriptSegmentSelector(
            incompleteSegment,
          )}`,
        );
      }

      const approvedAt = dependencies.clock.now();
      let updatedShotScript = currentShotScript;

      for (const segment of currentShotScript.segments) {
        if (segment.status === "approved") {
          continue;
        }

        updatedShotScript = mergeShotScriptSegment(
          updatedShotScript,
          toApprovedShotScriptSegment(segment, approvedAt),
          approvedAt,
        );
      }

      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript: updatedShotScript,
      });
      await dependencies.shotScriptReviewRepository.insert(
        createShotScriptReviewRecord({
          id: createShotScriptReviewId(currentShotScript.id, "approve_all"),
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
