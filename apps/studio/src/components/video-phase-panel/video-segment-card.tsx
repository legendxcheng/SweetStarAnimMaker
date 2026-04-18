import type { ChangeEvent } from "react";
import type { SegmentVideoRecord } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { VIDEO_STATUS_LABELS } from "./constants";
import { getAssetUrl } from "./utils";

interface VideoSegmentCardProps {
  cardClass: string;
  isBusy: boolean;
  isDirty: boolean;
  metaLabelClass: string;
  metaValueClass: string;
  onApprove: () => void;
  onDraftChange: (value: string) => void;
  onGenerate: () => void;
  onSaveConfig: () => void;
  onUploadAudio?: (file: File) => void;
  projectId: string;
  promptDraft: string;
  segment: SegmentVideoRecord;
}

export function VideoSegmentCard({
  cardClass,
  isBusy,
  isDirty,
  metaLabelClass,
  metaValueClass,
  onApprove,
  onDraftChange,
  onGenerate,
  onSaveConfig,
  onUploadAudio,
  projectId,
  promptDraft,
  segment,
}: VideoSegmentCardProps) {
  const canSaveConfig = promptDraft.trim().length > 0;
  const isGenerating = segment.status === "generating";
  const title = segment.segmentName ?? segment.segmentId;
  const audioInputId = `segment-audio-upload-${segment.id}`;

  function handleAudioInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !onUploadAudio) {
      return;
    }

    onUploadAudio(file);
    event.target.value = "";
  }

  return (
    <article
      data-testid={`video-segment-card-${segment.id}`}
      data-generating-state={isGenerating ? "true" : "false"}
      className={`${cardClass} ${isGenerating ? "border-(--color-accent) ring-1 ring-(--color-accent)/50 shadow-md shadow-(--color-accent)/20 transition-all duration-300" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-(--color-text-primary)">{title}</h4>
          <p className="mt-1 text-sm text-(--color-text-muted)">{segment.segmentSummary}</p>
        </div>
        <div className="text-right">
          <p className={metaLabelClass}>当前状态</p>
          <p className={`${metaValueClass} inline-flex items-center gap-2`}>
            {isGenerating && (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-(--color-accent) animate-pulse"
              />
            )}
            <span>{VIDEO_STATUS_LABELS[segment.status]}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="grid gap-4">
          {isGenerating ? (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-(--color-accent)/40 bg-(--color-accent)/8">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-3 h-8 w-8 rounded-full border-4 border-(--color-border-muted) border-t-(--color-accent) animate-spin" />
                <p className="text-sm font-medium tracking-wide text-(--color-accent)">
                  视频生成中...
                </p>
              </div>
            </div>
          ) : segment.videoAssetPath ? (
            <video
              controls
              preload="metadata"
              className="w-full rounded-xl border border-(--color-border) bg-black"
              poster={
                segment.thumbnailAssetPath
                  ? getAssetUrl(projectId, segment.thumbnailAssetPath, segment.updatedAt)
                  : undefined
              }
            >
              <source
                src={getAssetUrl(projectId, segment.videoAssetPath, segment.updatedAt)}
                type="video/mp4"
              />
            </video>
          ) : (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) text-sm text-(--color-text-muted)">
              当前 Segment 还没有可播放视频
            </div>
          )}

          <section className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
            <p className={`${metaLabelClass} mb-2`}>参考图片</p>
            {segment.referenceImages.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {segment.referenceImages.map((referenceImage) => (
                  <li key={referenceImage.id} className="overflow-hidden rounded-lg border border-(--color-border)">
                    <img
                      src={getAssetUrl(projectId, referenceImage.assetPath, segment.updatedAt)}
                      alt={referenceImage.label ?? referenceImage.id}
                      className="h-32 w-full object-cover"
                    />
                    <div className="px-3 py-2 text-xs text-(--color-text-muted)">
                      {referenceImage.label ?? referenceImage.id}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-(--color-text-muted)">暂无参考图片。</p>
            )}
          </section>
        </div>

        <div className="grid gap-3">
          <div>
            <p className={metaLabelClass}>Segment 提示词</p>
            <textarea
              value={promptDraft}
              onChange={(event) => {
                onDraftChange(event.target.value);
              }}
              rows={6}
              className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-2 text-sm text-(--color-text-primary) outline-none focus:border-(--color-primary)"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className={metaLabelClass}>Scene / Segment</p>
              <p className={metaValueClass}>
                {segment.sceneId} / {segment.segmentId}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>来源镜头数</p>
              <p className={metaValueClass}>{segment.shotCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>来源 Shot IDs</p>
              <p className={metaValueClass}>{segment.sourceShotIds.join(", ")}</p>
            </div>
            <div>
              <p className={metaLabelClass}>模型</p>
              <p className={metaValueClass}>{segment.model ?? "未生成"}</p>
            </div>
            <div>
              <p className={metaLabelClass}>Provider</p>
              <p className={metaValueClass}>{segment.provider ?? "未生成"}</p>
            </div>
            <div>
              <p className={metaLabelClass}>时长</p>
              <p className={metaValueClass}>
                {segment.durationSec !== null ? `${segment.durationSec}s` : "未知"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className={metaLabelClass}>参考音频</p>
              <label
                htmlFor={audioInputId}
                className={`${getButtonClassName({ variant: "warning" })} cursor-pointer`}
              >
                上传参考音频
                <input
                  id={audioInputId}
                  type="file"
                  accept="audio/*"
                  aria-label="上传参考音频"
                  className="sr-only"
                  disabled={isBusy}
                  onChange={handleAudioInputChange}
                />
              </label>
            </div>
            {segment.referenceAudios.length > 0 ? (
              <ul className="grid gap-2">
                {segment.referenceAudios.map((referenceAudio) => (
                  <li
                    key={referenceAudio.id}
                    className="rounded-lg border border-(--color-border) px-3 py-2"
                  >
                    <p className="text-sm text-(--color-text-primary)">
                      {referenceAudio.label ?? referenceAudio.id}
                    </p>
                    <p className="text-xs text-(--color-text-muted)">
                      {referenceAudio.durationSec ? `${referenceAudio.durationSec}s` : "时长未知"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-(--color-text-muted)">暂无参考音频。</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onSaveConfig}
              disabled={isBusy || !isDirty || !canSaveConfig}
              className={getButtonClassName()}
            >
              保存当前 Segment 配置
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isBusy || isDirty}
              className={getButtonClassName({ variant: "warning" })}
            >
              生成当前 Segment 视频
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isBusy || segment.status !== "in_review"}
              className={getButtonClassName({ variant: "success" })}
            >
              审核通过当前 Segment
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
