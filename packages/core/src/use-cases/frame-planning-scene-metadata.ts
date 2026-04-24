import type { ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";

import type {
  SegmentFrameRecordEntity,
  ShotReferenceFrameEntity,
  ShotReferenceRecordEntity,
} from "../domain/shot-image";
import type { ShotImageStorage } from "../ports/shot-image-storage";

interface FramePlanningSceneMetadata {
  selectedSceneId: string | null;
  selectedSceneName: string | null;
}

interface SceneMetadataHydrationOptions {
  shotImageStorage?: ShotImageStorage;
  sceneSheetRepository?: SceneSheetRepository;
}

export async function hydrateFrameWithPlanningSceneMetadata<TFrame extends ShotReferenceFrame>(
  frame: TFrame | SegmentFrameRecordEntity | ShotReferenceFrameEntity,
  options: SceneMetadataHydrationOptions = {},
): Promise<TFrame> {
  const frameWithFallback = withFallbackSceneMetadata(frame);
  const sceneMetadata = options.shotImageStorage
    ? readPlanningSceneMetadata(
        await options.shotImageStorage.readFramePlanning({
          projectStorageDir: (frame as SegmentFrameRecordEntity | ShotReferenceFrameEntity)
            .projectStorageDir,
          planningRelPath: (frame as SegmentFrameRecordEntity | ShotReferenceFrameEntity)
            .planningRelPath,
        }),
      )
    : {
        selectedSceneId: frameWithFallback.selectedSceneId ?? null,
        selectedSceneName: frameWithFallback.selectedSceneName ?? null,
      };

  const resolvedScene =
    sceneMetadata.selectedSceneId && options.sceneSheetRepository
      ? await options.sceneSheetRepository.findSceneById(sceneMetadata.selectedSceneId)
      : null;

  return {
    ...frameWithFallback,
    selectedSceneId: sceneMetadata.selectedSceneId,
    selectedSceneName: sceneMetadata.selectedSceneName,
    selectedSceneImageAssetPath: resolvedScene?.imageAssetPath ?? null,
  } as TFrame;
}

export async function hydrateShotWithPlanningSceneMetadata<TShot extends ShotReferenceRecord>(
  shot: TShot | ShotReferenceRecordEntity,
  options: SceneMetadataHydrationOptions = {},
): Promise<TShot> {
  const startFrame = await hydrateFrameWithPlanningSceneMetadata(shot.startFrame, options);

  if (shot.frameDependency === "start_and_end_frame" && shot.endFrame) {
    return {
      ...shot,
      startFrame,
      endFrame: await hydrateFrameWithPlanningSceneMetadata(shot.endFrame, options),
    } as TShot;
  }

  return {
    ...shot,
    startFrame,
    endFrame: null,
  } as TShot;
}

function readPlanningSceneMetadata(planning: Record<string, unknown> | null): FramePlanningSceneMetadata {
  return {
    selectedSceneId: readOptionalString(planning?.selectedSceneId),
    selectedSceneName: readOptionalString(planning?.selectedSceneName),
  };
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function withFallbackSceneMetadata<
  TFrame extends {
    selectedSceneId?: string | null;
    selectedSceneName?: string | null;
    selectedSceneImageAssetPath?: string | null;
  },
>(
  frame: TFrame,
) {
  return {
    ...frame,
    selectedSceneId: frame.selectedSceneId ?? null,
    selectedSceneName: frame.selectedSceneName ?? null,
    selectedSceneImageAssetPath: frame.selectedSceneImageAssetPath ?? null,
  };
}
