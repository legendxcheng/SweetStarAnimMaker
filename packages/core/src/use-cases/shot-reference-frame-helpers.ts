import type { ProjectStatus } from "@sweet-star/shared";

import type {
  SegmentFrameRecordEntity,
  ShotReferenceFrameEntity,
  ShotReferenceRecordEntity,
} from "../domain/shot-image";
import type { ShotImageRepository } from "../ports/shot-image-repository";

export interface ResolvedShotFrameRecord {
  shot: ShotReferenceRecordEntity;
  frame: ShotReferenceFrameEntity;
}

export async function resolveShotFrameRecord(input: {
  repository: ShotImageRepository;
  batchId: string;
  frameId: string;
  shotId?: string;
}): Promise<ResolvedShotFrameRecord | null> {
  const shotById =
    input.shotId && input.repository.findShotById
      ? await input.repository.findShotById(input.shotId)
      : null;

  if (shotById) {
    const frame = findFrameInShot(shotById, input.frameId);

    if (frame) {
      return { shot: shotById, frame };
    }
  }

  if (!input.repository.listShotsByBatchId) {
    return null;
  }

  const shots = await input.repository.listShotsByBatchId(input.batchId);

  for (const shot of shots) {
    const frame = findFrameInShot(shot, input.frameId);

    if (frame) {
      return { shot, frame };
    }
  }

  return null;
}

export function replaceFrameOnShot(
  shot: ShotReferenceRecordEntity,
  updatedFrame: ShotReferenceFrameEntity,
): ShotReferenceRecordEntity {
  const startFrame = shot.startFrame.id === updatedFrame.id ? updatedFrame : shot.startFrame;

  if (shot.frameDependency === "start_and_end_frame") {
    const nextShot = {
      ...shot,
      startFrame,
      endFrame: shot.endFrame.id === updatedFrame.id ? updatedFrame : shot.endFrame,
      updatedAt: updatedFrame.updatedAt,
    };

    return {
      ...nextShot,
      referenceStatus: deriveShotReferenceStatus(nextShot),
    };
  }

  return {
    ...shot,
    startFrame,
    endFrame: null,
    updatedAt: updatedFrame.updatedAt,
    referenceStatus: deriveShotReferenceStatus({
      startFrame,
      endFrame: null,
    }),
  };
}

export function deriveShotReferenceStatus(
  shot: Pick<ShotReferenceRecordEntity, "startFrame" | "endFrame">,
) {
  const requiredFrames = getRequiredFrames(shot);

  if (requiredFrames.some((frame) => frame.imageStatus === "failed")) {
    return "failed" as const;
  }

  if (requiredFrames.every((frame) => frame.imageStatus === "approved")) {
    return "approved" as const;
  }

  if (
    requiredFrames.every(
      (frame) => frame.imageStatus === "approved" || frame.imageStatus === "in_review",
    )
  ) {
    return "in_review" as const;
  }

  return "pending" as const;
}

export function deriveProjectImageStatusFromShots(
  shots: Array<Pick<ShotReferenceRecordEntity, "startFrame" | "endFrame" | "referenceStatus">>,
): ProjectStatus {
  const requiredFrames = shots.flatMap((shot) => getRequiredFrames(shot));

  if (requiredFrames.some((frame) => frame.imageStatus === "generating")) {
    return "images_generating";
  }

  if (shots.length > 0 && shots.every((shot) => shot.referenceStatus === "approved")) {
    return "images_approved";
  }

  return "images_in_review";
}

export function isShotReadyForApproval(
  shot: Pick<ShotReferenceRecordEntity, "startFrame" | "endFrame">,
) {
  return getRequiredFrames(shot).every(
    (frame) => frame.imageStatus === "in_review" || frame.imageStatus === "approved",
  );
}

export function approveShot(
  shot: ShotReferenceRecordEntity,
  approvedAt: string,
): ShotReferenceRecordEntity {
  const approvedFrames = getRequiredFrames(shot).map((frame) => ({
    ...frame,
    imageStatus: "approved" as const,
    approvedAt: frame.approvedAt ?? approvedAt,
    updatedAt: approvedAt,
  }));
  const [startFrame, endFrame] = approvedFrames;

  if (shot.frameDependency === "start_and_end_frame") {
    return {
      ...shot,
      referenceStatus: "approved",
      updatedAt: approvedAt,
      startFrame,
      endFrame: endFrame ?? shot.endFrame,
    };
  }

  return {
    ...shot,
    referenceStatus: "approved",
    updatedAt: approvedAt,
    startFrame,
    endFrame: null,
  };
}

export function deriveProjectImageStatusFromFrames(
  frames: Array<Pick<SegmentFrameRecordEntity, "id" | "imageStatus">>,
  updatedFrame: Pick<SegmentFrameRecordEntity, "id" | "imageStatus">,
): ProjectStatus {
  const nextFrames = frames.some((frame) => frame.id === updatedFrame.id)
    ? frames.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame))
    : [...frames, updatedFrame];

  if (nextFrames.some((frame) => frame.imageStatus === "generating")) {
    return "images_generating";
  }

  if (nextFrames.every((frame) => frame.imageStatus === "approved")) {
    return "images_approved";
  }

  return "images_in_review";
}

export function replaceShotInCollection(
  shots: ShotReferenceRecordEntity[],
  updatedShot: ShotReferenceRecordEntity,
) {
  return shots.some((shot) => shot.id === updatedShot.id)
    ? shots.map((shot) => (shot.id === updatedShot.id ? updatedShot : shot))
    : [...shots, updatedShot];
}

function findFrameInShot(shot: ShotReferenceRecordEntity, frameId: string) {
  if (shot.startFrame.id === frameId) {
    return shot.startFrame;
  }

  if (shot.endFrame?.id === frameId) {
    return shot.endFrame;
  }

  return null;
}

function getRequiredFrames(shot: Pick<ShotReferenceRecordEntity, "startFrame" | "endFrame">) {
  return shot.endFrame ? [shot.startFrame, shot.endFrame] : [shot.startFrame];
}
