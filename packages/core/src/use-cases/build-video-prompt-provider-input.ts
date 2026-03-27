import type { ShotScriptItem, ShotScriptSegment } from "@sweet-star/shared";

import type { ShotReferenceRecordEntity } from "../domain/shot-image";
import type { GenerateVideoPromptInput } from "../ports/video-prompt-provider";

export function buildVideoPromptProviderInput(input: {
  projectId: string;
  segment: ShotScriptSegment;
  shot: ShotScriptItem;
  shotReference: ShotReferenceRecordEntity;
}): GenerateVideoPromptInput {
  return {
    projectId: input.projectId,
    segment: {
      segmentId: input.segment.segmentId,
      sceneId: input.segment.sceneId,
      order: input.segment.order,
      summary: input.segment.summary,
    },
    currentShot: {
      id: input.shot.id,
      shotCode: input.shot.shotCode,
      purpose: input.shot.purpose,
      visual: input.shot.visual,
      subject: input.shot.subject,
      action: input.shot.action,
      frameDependency: input.shot.frameDependency,
      dialogue: input.shot.dialogue,
      os: input.shot.os,
      audio: input.shot.audio,
      transitionHint: input.shot.transitionHint,
      continuityNotes: input.shot.continuityNotes,
    },
    durationSec: input.shot.durationSec ?? null,
    startFrame: {
      imageAssetPath: input.shotReference.startFrame.imageAssetPath,
      width: input.shotReference.startFrame.imageWidth,
      height: input.shotReference.startFrame.imageHeight,
    },
    endFrame: input.shotReference.endFrame
      ? {
          imageAssetPath: input.shotReference.endFrame.imageAssetPath,
          width: input.shotReference.endFrame.imageWidth,
          height: input.shotReference.endFrame.imageHeight,
        }
      : null,
  };
}
