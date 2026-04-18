import type {
  SegmentVideoReferenceAudio,
  SegmentVideoReferenceImage,
  ShotScriptItem,
  ShotScriptSegment,
} from "@sweet-star/shared";

import type { ShotReferenceRecordEntity } from "../domain/shot-image";
import type { GenerateVideoPromptInput } from "../ports/video-prompt-provider";

export function buildVideoPromptProviderInput(input: {
  projectId: string;
  segment: ShotScriptSegment;
  shots?: ShotScriptItem[];
  referenceImages?: SegmentVideoReferenceImage[];
  referenceAudios?: SegmentVideoReferenceAudio[];
  shot?: ShotScriptItem;
  shotReference?: ShotReferenceRecordEntity;
}): GenerateVideoPromptInput {
  const shots = resolveShots(input);
  const referenceImages = resolveReferenceImages(input);
  const shotDurationSum = shots.reduce((sum, shot) => sum + (shot.durationSec ?? 0), 0);
  const durationSec = input.segment.durationSec ?? (shotDurationSum > 0 ? shotDurationSum : null);

  return {
    projectId: input.projectId,
    segment: {
      segmentId: input.segment.segmentId,
      sceneId: input.segment.sceneId,
      order: input.segment.order,
      name: input.segment.name ?? null,
      summary: input.segment.summary,
      durationSec: input.segment.durationSec ?? null,
      shotCount: shots.length,
    },
    shots: shots.map((shot) => ({
      id: shot.id,
      shotCode: shot.shotCode,
      purpose: shot.purpose,
      visual: shot.visual,
      subject: shot.subject,
      action: shot.action,
      frameDependency: shot.frameDependency,
      dialogue: shot.dialogue,
      os: shot.os,
      audio: shot.audio,
      transitionHint: shot.transitionHint,
      continuityNotes: shot.continuityNotes,
      durationSec: shot.durationSec ?? null,
    })),
    referenceImages,
    referenceAudios: [...(input.referenceAudios ?? [])].sort((left, right) => left.order - right.order),
    currentShot: shots[0]
      ? {
          id: shots[0].id,
          shotCode: shots[0].shotCode,
          purpose: shots[0].purpose,
          visual: shots[0].visual,
          subject: shots[0].subject,
          action: shots[0].action,
          frameDependency: shots[0].frameDependency,
          dialogue: shots[0].dialogue,
          os: shots[0].os,
          audio: shots[0].audio,
          transitionHint: shots[0].transitionHint,
          continuityNotes: shots[0].continuityNotes,
          durationSec: shots[0].durationSec ?? null,
        }
      : undefined,
    durationSec,
    startFrame: input.shotReference
      ? {
          imageAssetPath: input.shotReference.startFrame.imageAssetPath,
          width: input.shotReference.startFrame.imageWidth,
          height: input.shotReference.startFrame.imageHeight,
        }
      : undefined,
    endFrame: input.shotReference?.endFrame
      ? {
          imageAssetPath: input.shotReference.endFrame.imageAssetPath,
          width: input.shotReference.endFrame.imageWidth,
          height: input.shotReference.endFrame.imageHeight,
        }
      : null,
  };
}

function resolveShots(input: {
  segment: ShotScriptSegment;
  shots?: ShotScriptItem[];
  shot?: ShotScriptItem;
}) {
  const segmentShots = input.shots ?? input.segment.shots;

  if (segmentShots.length > 0) {
    return [...segmentShots].sort((left, right) => left.order - right.order);
  }

  return input.shot ? [input.shot] : [];
}

function resolveReferenceImages(input: {
  referenceImages?: SegmentVideoReferenceImage[];
  shotReference?: ShotReferenceRecordEntity;
}) {
  if (input.referenceImages && input.referenceImages.length > 0) {
    return [...input.referenceImages].sort((left, right) => left.order - right.order);
  }

  if (!input.shotReference) {
    return [];
  }

  const references: SegmentVideoReferenceImage[] = [];
  const startAssetPath = input.shotReference.startFrame.imageAssetPath?.trim();
  const endAssetPath = input.shotReference.endFrame?.imageAssetPath?.trim();

  if (startAssetPath) {
    references.push({
      id: `video_ref_image_${input.shotReference.segmentId}_${input.shotReference.shotId}_start_frame`,
      assetPath: startAssetPath,
      source: "auto",
      order: 0,
      sourceShotId: input.shotReference.shotId,
      label: `${input.shotReference.shotCode} start`,
    });
  }

  if (endAssetPath && endAssetPath !== startAssetPath) {
    references.push({
      id: `video_ref_image_${input.shotReference.segmentId}_${input.shotReference.shotId}_end_frame`,
      assetPath: endAssetPath,
      source: "auto",
      order: references.length,
      sourceShotId: input.shotReference.shotId,
      label: `${input.shotReference.shotCode} end`,
    });
  }

  return references;
}
