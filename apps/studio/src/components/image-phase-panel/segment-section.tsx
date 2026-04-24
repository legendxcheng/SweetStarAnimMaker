import type { ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { ShotCard } from "./shot-card";
import type {
  FrameDraftMap,
  FrameDraftState,
  ImageSegmentGroup,
  ImagePhaseActionBusy,
} from "./types";

interface SegmentSectionProps {
  cardClass: string;
  projectId: string;
  visualStyleText: string;
  segment: ImageSegmentGroup;
  index: number;
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

export function SegmentSection({
  cardClass,
  projectId,
  visualStyleText,
  segment,
  index,
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
}: SegmentSectionProps) {
  return (
    <article className={cardClass}>
      <div className="mb-4">
        <h4 className="text-base font-semibold text-(--color-text-primary)">
          Segment {segment.segmentOrder ?? index + 1}
        </h4>
        <p className="text-sm text-(--color-text-muted) mt-1">
          {segment.sceneId} / {segment.segmentId}
        </p>
      </div>

      <ShotCard
        projectId={projectId}
        visualStyleText={visualStyleText}
        shot={segment.segment}
        drafts={drafts}
        actionBusy={actionBusy}
        metaLabelClass={metaLabelClass}
        metaValueClass={metaValueClass}
        endFrameDependencyMessage={endFrameDependencyMessage}
        onDraftChange={onDraftChange}
        onSavePrompt={onSavePrompt}
        onRegeneratePrompt={onRegeneratePrompt}
        onGenerateFrame={onGenerateFrame}
        onApproveShot={onApproveShot}
      />
    </article>
  );
}
