import type { CharacterSheetRecord } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";

interface CharacterSheetImagePreviewModalProps {
  selectedCharacter: CharacterSheetRecord | null;
  selectedCharacterImageUrl: string | null;
  open: boolean;
  onClose: () => void;
}

export function CharacterSheetImagePreviewModal({
  selectedCharacter,
  selectedCharacterImageUrl,
  open,
  onClose,
}: CharacterSheetImagePreviewModalProps) {
  if (!selectedCharacter || !selectedCharacterImageUrl || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${selectedCharacter.characterName} 当前立绘预览`}
        className="relative max-h-full w-full max-w-6xl rounded-2xl border border-white/10 bg-(--color-bg-surface) p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-(--color-text-primary)">
              {selectedCharacter.characterName} 当前立绘预览
            </p>
            <p className="text-sm text-(--color-text-muted)">
              {selectedCharacter.imageWidth && selectedCharacter.imageHeight
                ? `${selectedCharacter.imageWidth} × ${selectedCharacter.imageHeight}`
                : "原始尺寸"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={getButtonClassName({
              variant: "secondary",
              size: "compact",
            })}
          >
            关闭大图预览
          </button>
        </div>

        <div className="max-h-[80vh] overflow-auto rounded-xl bg-black/20">
          <img
            src={selectedCharacterImageUrl}
            alt={`${selectedCharacter.characterName} 当前立绘大图`}
            className="mx-auto block h-auto max-w-full rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
