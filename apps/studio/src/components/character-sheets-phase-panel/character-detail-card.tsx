import type { ChangeEvent } from "react";
import type { CharacterSheetRecord } from "@sweet-star/shared";

import { config } from "../../services/config";
import { getButtonClassName } from "../../styles/button-styles";
import { ErrorState } from "../error-state";
import {
  CARD_CLASS,
  CHARACTER_STATUS_LABELS,
  META_LABEL_CLASS,
  META_VALUE_CLASS,
} from "./constants";
import type { CharacterSheetsPhaseActionBusy } from "./types";

interface CharacterSheetDetailCardProps {
  projectId: string;
  selectedCharacterTitle: string;
  selectedCharacter: CharacterSheetRecord | null;
  selectedCharacterImageUrl: string | null;
  detailLoading: boolean;
  detailError: Error | null;
  promptDraft: string;
  actionError: Error | null;
  actionBusy: CharacterSheetsPhaseActionBusy;
  onPromptDraftChange: (value: string) => void;
  onOpenImagePreview: () => void;
  onUploadReferenceImages: (files: FileList | null) => Promise<void>;
  onDeleteReferenceImage: (referenceImageId: string) => Promise<void>;
  onSavePrompt: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onApprove: () => Promise<void>;
}

export function CharacterSheetDetailCard({
  projectId,
  selectedCharacterTitle,
  selectedCharacter,
  selectedCharacterImageUrl,
  detailLoading,
  detailError,
  promptDraft,
  actionError,
  actionBusy,
  onPromptDraftChange,
  onOpenImagePreview,
  onUploadReferenceImages,
  onDeleteReferenceImage,
  onSavePrompt,
  onRegenerate,
  onApprove,
}: CharacterSheetDetailCardProps) {
  const selectedReferenceImages = selectedCharacter?.referenceImages ?? [];

  function handleReferenceImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    void onUploadReferenceImages(event.target.files);
    event.target.value = "";
  }

  return (
    <div className={CARD_CLASS}>
      <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">
        {selectedCharacterTitle}
      </h4>

      {detailError && <ErrorState error={detailError} />}

      {detailLoading && <p className="text-sm text-(--color-text-muted)">正在加载角色详情...</p>}

      {!detailLoading && !detailError && !selectedCharacter && (
        <p className="text-sm text-(--color-text-muted)">选择一个角色以查看和编辑当前设定。</p>
      )}

      {selectedCharacter && !detailLoading && !detailError && (
        <div className="grid gap-4">
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={META_LABEL_CLASS}>当前立绘预览</p>
                <p className="text-sm text-(--color-text-muted)">点击缩略图或按钮查看大图。</p>
              </div>
              <button
                type="button"
                onClick={onOpenImagePreview}
                disabled={!selectedCharacter.imageAssetPath}
                className={getButtonClassName({
                  variant: "secondary",
                  size: "compact",
                })}
              >
                查看大图
              </button>
            </div>

            {selectedCharacter.imageAssetPath && selectedCharacterImageUrl ? (
              <button
                type="button"
                onClick={onOpenImagePreview}
                className="block w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-surface)"
              >
                <img
                  src={selectedCharacterImageUrl}
                  alt={`${selectedCharacter.characterName} 当前立绘`}
                  className="h-72 w-full object-contain bg-(--color-bg-elevated)"
                />
              </button>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-surface) text-sm text-(--color-text-muted)">
                尚未生成当前立绘
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={META_LABEL_CLASS}>当前状态</p>
              <p className={META_VALUE_CLASS}>{CHARACTER_STATUS_LABELS[selectedCharacter.status]}</p>
            </div>
            <div>
              <p className={META_LABEL_CLASS}>图像资源</p>
              <p className={`${META_VALUE_CLASS} break-all`}>
                {selectedCharacter.imageAssetPath ?? "尚未生成"}
              </p>
            </div>
          </div>

          <div>
            <p className={META_LABEL_CLASS}>当前提示词</p>
            <textarea
              value={promptDraft}
              onChange={(event) => onPromptDraftChange(event.target.value)}
              className="w-full min-h-40 rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-3 text-sm text-(--color-text-primary)"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className={META_LABEL_CLASS}>参考图</p>
              <div>
                <label
                  className={`inline-flex cursor-pointer items-center ${getButtonClassName({
                    variant: "secondary",
                    size: "compact",
                  })}`}
                >
                  添加参考图
                  <input
                    aria-label="添加参考图"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleReferenceImageInputChange}
                  />
                </label>
              </div>
            </div>

            {selectedReferenceImages.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedReferenceImages.map((referenceImage) => (
                  <div
                    key={referenceImage.id}
                    className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-3"
                  >
                    <img
                      src={config.characterReferenceImageContentUrl(
                        projectId,
                        selectedCharacter.id,
                        referenceImage.id,
                      )}
                      alt={referenceImage.originalFileName}
                      className="mb-3 h-32 w-full rounded-lg object-cover"
                    />
                    <p className="mb-2 truncate text-sm text-(--color-text-primary)">
                      {referenceImage.originalFileName}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void onDeleteReferenceImage(referenceImage.id);
                      }}
                      disabled={actionBusy !== null}
                      aria-label={`删除参考图 ${referenceImage.originalFileName}`}
                      className={getButtonClassName({
                        variant: "danger",
                        size: "compact",
                      })}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-(--color-text-muted)">
                暂无参考图。添加后会在重新生成时自动带入。
              </p>
            )}
          </div>

          {actionError && <ErrorState error={actionError} />}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void onSavePrompt();
              }}
              disabled={actionBusy !== null}
              className={getButtonClassName({ variant: "secondary" })}
            >
              保存提示词
            </button>
            <button
              type="button"
              onClick={() => {
                void onRegenerate();
              }}
              disabled={actionBusy !== null}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成
            </button>
            <button
              type="button"
              onClick={() => {
                void onApprove();
              }}
              disabled={actionBusy !== null}
              className={getButtonClassName({ variant: "success" })}
            >
              通过当前角色
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
