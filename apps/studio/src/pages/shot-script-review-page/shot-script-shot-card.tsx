import type { ShotFrameDependency, ShotScriptItem } from "@sweet-star/shared";

import { inputClass, shotFrameDependencyOptions, textareaClass } from "./constants";

type UpdateShotField = <K extends keyof ShotScriptItem>(
  shotIndex: number,
  field: K,
  value: ShotScriptItem[K],
) => void;

type ShotScriptShotCardProps = {
  shot: ShotScriptItem;
  shotIndex: number;
  onUpdateShotField: UpdateShotField;
};

export function ShotScriptShotCard({
  shot,
  shotIndex,
  onUpdateShotField,
}: ShotScriptShotCardProps) {
  return (
    <article className="rounded-lg border border-(--color-border-muted) bg-(--color-bg-base) p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">镜头 {shot.order}</p>
        <p className="mt-1 text-sm font-semibold text-(--color-text-primary)">{shot.shotCode}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label
            htmlFor={`shot-code-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 编号
          </label>
          <input
            id={`shot-code-${shot.id}`}
            value={shot.shotCode}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "shotCode", event.target.value)
            }
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-duration-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 时长（秒）
          </label>
          <input
            id={`shot-duration-${shot.id}`}
            type="number"
            value={shot.durationSec ?? ""}
            onChange={(event) =>
              onUpdateShotField(
                shotIndex,
                "durationSec",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-purpose-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 目的
          </label>
          <textarea
            id={`shot-purpose-${shot.id}`}
            value={shot.purpose}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "purpose", event.target.value)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-subject-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 主体
          </label>
          <input
            id={`shot-subject-${shot.id}`}
            value={shot.subject}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "subject", event.target.value)
            }
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-visual-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 画面
          </label>
          <textarea
            id={`shot-visual-${shot.id}`}
            value={shot.visual}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "visual", event.target.value)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-action-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 动作
          </label>
          <textarea
            id={`shot-action-${shot.id}`}
            value={shot.action}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "action", event.target.value)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-frame-dependency-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 画面依赖
          </label>
          <select
            id={`shot-frame-dependency-${shot.id}`}
            value={shot.frameDependency}
            onChange={(event) =>
              onUpdateShotField(
                shotIndex,
                "frameDependency",
                event.target.value as ShotFrameDependency,
              )
            }
            className={inputClass}
          >
            {shotFrameDependencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`shot-dialogue-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 对白
          </label>
          <textarea
            id={`shot-dialogue-${shot.id}`}
            value={shot.dialogue ?? ""}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "dialogue", event.target.value || null)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-os-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 旁白 / OS
          </label>
          <textarea
            id={`shot-os-${shot.id}`}
            value={shot.os ?? ""}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "os", event.target.value || null)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-audio-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 音频
          </label>
          <textarea
            id={`shot-audio-${shot.id}`}
            value={shot.audio ?? ""}
            onChange={(event) =>
              onUpdateShotField(shotIndex, "audio", event.target.value || null)
            }
            rows={2}
            className={textareaClass}
          />
        </div>
        <div>
          <label
            htmlFor={`shot-transition-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 转场提示
          </label>
          <input
            id={`shot-transition-${shot.id}`}
            value={shot.transitionHint ?? ""}
            onChange={(event) =>
              onUpdateShotField(
                shotIndex,
                "transitionHint",
                event.target.value || null,
              )
            }
            className={inputClass}
          />
        </div>
        <div className="lg:col-span-2">
          <label
            htmlFor={`shot-continuity-${shot.id}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            镜头 {shot.order} 连续性提示
          </label>
          <textarea
            id={`shot-continuity-${shot.id}`}
            value={shot.continuityNotes ?? ""}
            onChange={(event) =>
              onUpdateShotField(
                shotIndex,
                "continuityNotes",
                event.target.value || null,
              )
            }
            rows={2}
            className={textareaClass}
          />
        </div>
      </div>
    </article>
  );
}
