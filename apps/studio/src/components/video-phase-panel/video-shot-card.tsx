import type { ShotVideoRecord } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { VIDEO_STATUS_LABELS } from "./constants";
import { getAssetUrl } from "./utils";

interface VideoShotCardProps {
  cardClass: string;
  isBusy: boolean;
  isDirty: boolean;
  metaLabelClass: string;
  metaValueClass: string;
  onApprove: () => void;
  onDraftChange: (value: string) => void;
  onRegenerate: () => void;
  onRegeneratePrompt: () => void;
  onSavePrompt: () => void;
  projectId: string;
  promptDraft: string;
  shot: ShotVideoRecord;
}

export function VideoShotCard({
  cardClass,
  isBusy,
  isDirty,
  metaLabelClass,
  metaValueClass,
  onApprove,
  onDraftChange,
  onRegenerate,
  onRegeneratePrompt,
  onSavePrompt,
  projectId,
  promptDraft,
  shot,
}: VideoShotCardProps) {
  const canSavePrompt = promptDraft.trim().length > 0;
  const isGenerating = shot.status === "generating";

  return (
    <article
      data-testid={`video-shot-card-${shot.id}`}
      data-generating-state={isGenerating ? "true" : "false"}
      className={`${cardClass} ${isGenerating ? "border-(--color-accent) ring-1 ring-(--color-accent)/50 shadow-md shadow-(--color-accent)/20 transition-all duration-300" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-(--color-text-primary)">{shot.shotCode}</h4>
          <p className="text-sm text-(--color-text-muted) mt-1">{shot.sceneId}</p>
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
            <span>{VIDEO_STATUS_LABELS[shot.status]}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div>
          {isGenerating ? (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-(--color-accent)/40 bg-(--color-accent)/8">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-3 h-8 w-8 rounded-full border-4 border-(--color-border-muted) border-t-(--color-accent) animate-spin" />
                <p className="text-sm font-medium tracking-wide text-(--color-accent)">
                  视频生成中...
                </p>
              </div>
            </div>
          ) : shot.videoAssetPath ? (
            <video
              controls
              preload="metadata"
              className="w-full rounded-xl border border-(--color-border) bg-black"
              poster={
                shot.thumbnailAssetPath
                  ? getAssetUrl(projectId, shot.thumbnailAssetPath, shot.updatedAt)
                  : undefined
              }
            >
              <source
                src={getAssetUrl(projectId, shot.videoAssetPath, shot.updatedAt)}
                type="video/mp4"
              />
            </video>
          ) : (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) text-sm text-(--color-text-muted)">
              当前 Shot 还没有可播放视频
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div>
            <p className={metaLabelClass}>视频提示词</p>
            <textarea
              value={promptDraft}
              onChange={(event) => {
                onDraftChange(event.target.value);
              }}
              rows={6}
              className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-2 text-sm text-(--color-text-primary) outline-none focus:border-(--color-primary)"
            />
          </div>
          <div>
            <p className={metaLabelClass}>Shot ID</p>
            <p className={metaValueClass}>{shot.shotId}</p>
          </div>
          <div>
            <p className={metaLabelClass}>镜头依赖</p>
            <p className={metaValueClass}>
              {shot.frameDependency === "start_frame_only" ? "仅起始帧" : "起始帧 + 结束帧"}
            </p>
          </div>
          <div>
            <p className={metaLabelClass}>模型</p>
            <p className={metaValueClass}>{shot.model ?? "未生成"}</p>
          </div>
          <div>
            <p className={metaLabelClass}>Provider</p>
            <p className={metaValueClass}>{shot.provider ?? "未生成"}</p>
          </div>
          <div>
            <p className={metaLabelClass}>时长</p>
            <p className={metaValueClass}>
              {shot.durationSec !== null ? `${shot.durationSec}s` : "未知"}
            </p>
          </div>
          <div>
            <p className={metaLabelClass}>更新时间</p>
            <p className={metaValueClass}>
              {new Date(shot.updatedAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            {isDirty ? (
              <button
                type="button"
                onClick={onSavePrompt}
                disabled={isBusy || !canSavePrompt}
                className={getButtonClassName()}
              >
                保存提示词
              </button>
            ) : (
              <button
                type="button"
                onClick={onRegeneratePrompt}
                disabled={isBusy}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成当前镜头提示词
              </button>
            )}
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isBusy || isDirty}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成当前镜头视频
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isBusy || shot.status !== "in_review"}
              className={getButtonClassName({ variant: "success" })}
            >
              审核通过当前镜头
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
