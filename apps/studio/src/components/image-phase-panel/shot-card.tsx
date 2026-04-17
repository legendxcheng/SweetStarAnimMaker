import type { ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { FrameEditorCard } from "./frame-editor-card";
import type { FrameDraftMap, FrameDraftState, ImagePhaseActionBusy } from "./types";
import { buildShotDisplayLabel, isShotReadyForApproval } from "./utils";

interface ShotCardProps {
  projectId: string;
  visualStyleText: string;
  shot: ShotReferenceRecord;
  drafts: FrameDraftMap;
  actionBusy: ImagePhaseActionBusy | null;
  metaLabelClass: string;
  metaValueClass: string;
  endFrameDependencyMessage: string;
  onDraftChange: (frameId: string, nextDraft: FrameDraftState) => void;
  onSavePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onRegeneratePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onGenerateFrame: (frame: ShotReferenceFrame) => Promise<void>;
  onApproveShot: (shot: ShotReferenceRecord) => Promise<void>;
}

export function ShotCard({
  projectId,
  visualStyleText,
  shot,
  drafts,
  actionBusy,
  metaLabelClass,
  metaValueClass,
  endFrameDependencyMessage,
  onDraftChange,
  onSavePrompt,
  onRegeneratePrompt,
  onGenerateFrame,
  onApproveShot,
}: ShotCardProps) {
  const shotBusy =
    actionBusy?.kind === "approve-all" ||
    actionBusy?.kind === "regenerate-all-prompts" ||
    actionBusy?.kind === "regenerate-failed-prompts" ||
    actionBusy?.kind === "regenerate-failed-frames" ||
    actionBusy?.kind === "generate-all-frames" ||
    (actionBusy?.kind === "approve" && actionBusy.shotId === shot.id);
  const canApproveShot = shot.referenceStatus !== "approved" && isShotReadyForApproval(shot);
  const isEndFrameGenerationBlocked =
    shot.frameDependency === "start_and_end_frame" && !shot.startFrame.imageAssetPath;

  function isFrameBusy(frameId: string) {
    return (
      shotBusy ||
      (actionBusy?.frameId === frameId &&
        (actionBusy.kind === "save" ||
          actionBusy.kind === "regenerate" ||
          actionBusy.kind === "generate"))
    );
  }

  return (
    <section className="rounded-xl border border-(--color-border-muted) bg-(--color-bg-base) p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h5 className="text-base font-semibold text-(--color-text-primary)">
            {buildShotDisplayLabel(shot)}
          </h5>
          <p className="text-sm text-(--color-text-muted) mt-1">Shot Code: {shot.shotCode}</p>
          <p className="text-sm text-(--color-text-muted)">Shot ID: {shot.shotId}</p>
        </div>
        <div className="text-right">
          <p className={metaLabelClass}>镜头依赖</p>
          <p className={metaValueClass}>
            {shot.frameDependency === "start_frame_only" ? "仅起始帧" : "起始帧 + 结束帧"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FrameEditorCard
          projectId={projectId}
          visualStyleText={visualStyleText}
          frame={shot.startFrame}
          draft={drafts[shot.startFrame.id]}
          busy={isFrameBusy(shot.startFrame.id)}
          generationBlocked={false}
          metaLabelClass={metaLabelClass}
          metaValueClass={metaValueClass}
          onDraftChange={onDraftChange}
          onSavePrompt={onSavePrompt}
          onRegeneratePrompt={onRegeneratePrompt}
          onGenerateFrame={onGenerateFrame}
        />
        {shot.endFrame && (
          <FrameEditorCard
            projectId={projectId}
            visualStyleText={visualStyleText}
            frame={shot.endFrame}
            draft={drafts[shot.endFrame.id]}
            busy={isFrameBusy(shot.endFrame.id)}
            generationBlocked={isEndFrameGenerationBlocked}
            generationBlockedMessage={
              isEndFrameGenerationBlocked ? endFrameDependencyMessage : undefined
            }
            metaLabelClass={metaLabelClass}
            metaValueClass={metaValueClass}
            onDraftChange={onDraftChange}
            onSavePrompt={onSavePrompt}
            onRegeneratePrompt={onRegeneratePrompt}
            onGenerateFrame={onGenerateFrame}
          />
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            void onApproveShot(shot);
          }}
          disabled={shotBusy || !canApproveShot}
          className={getButtonClassName({ variant: "success" })}
        >
          审核通过当前镜头
        </button>
      </div>
    </section>
  );
}
