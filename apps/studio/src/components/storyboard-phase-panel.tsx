import { useEffect, useMemo, useState } from "react";
import type { CurrentStoryboard, ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { Link } from "react-router-dom";

import { ErrorState } from "./error-state";
import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface StoryboardPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
}

function formatDuration(durationSec: number | null) {
  return durationSec === null ? "未设置" : `${durationSec} 秒`;
}

export function StoryboardPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
}: StoryboardPhasePanelProps) {
  const [currentStoryboard, setCurrentStoryboard] = useState<CurrentStoryboard | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const [detailRequestVersion, setDetailRequestVersion] = useState(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";

  const scenes = useMemo(
    () => currentStoryboard?.scenes ?? [],
    [currentStoryboard],
  );

  useEffect(() => {
    if (scenes.length === 0) {
      setActiveSceneIndex(0);
      return;
    }
    setActiveSceneIndex((current) =>
      current < scenes.length ? current : 0,
    );
  }, [scenes]);

  useEffect(() => {
    if (!project.currentStoryboard) {
      setCurrentStoryboard(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCurrentStoryboard() {
      setDetailLoading(true);
      try {
        const detail = await apiClient.getCurrentStoryboard(project.id);
        if (cancelled) {
          return;
        }
        setCurrentStoryboard(detail);
        setDetailError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCurrentStoryboard(null);
        setDetailError(error as Error);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadCurrentStoryboard();

    return () => {
      cancelled = true;
    };
  }, [project.id, project.currentStoryboard?.id, detailRequestVersion]);

  return (
    <section aria-label="分镜工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">分镜工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              基于已通过的主情节生成分镜文案、跟踪任务状态，并进入审核。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className={getButtonClassName()}
          >
            {creatingTask ? "启动中..." : "重新生成"}
          </button>
        </div>
      </div>

      {task && (
        <div className={cardClass}>
          <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">任务状态</h4>
          <div className="grid gap-2">
            <div>
              <p className={metaLabelClass}>任务 ID</p>
              <p className={`${metaValueClass} font-mono text-xs`}>{task.id}</p>
            </div>
            <div>
              <p className={metaLabelClass}>状态</p>
              <p className={metaValueClass}>{TASK_STATUS_LABELS[task.status]}</p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(task.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
            {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
          </div>
        </div>
      )}

      {taskError && task && (
        <div className="mb-4">
          <ErrorState error={taskError} />
        </div>
      )}

      {project.status === "storyboard_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">分镜文案生成中，正在自动刷新项目状态。</p>
        </div>
      )}

      {project.currentStoryboard && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="text-base font-semibold text-(--color-text-primary)">当前分镜文案</h4>
            {project.status === "storyboard_in_review" && (
              <Link
                to={`/projects/${project.id}/storyboard/review`}
                className={`inline-flex items-center no-underline ${getButtonClassName()}`}
              >
                进入分镜审核 →
              </Link>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className={metaLabelClass}>标题</p>
              <p className={`${metaValueClass} text-base font-semibold`}>
                {project.currentStoryboard.title ?? "未命名"}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>集标题</p>
              <p className={metaValueClass}>
                {project.currentStoryboard.episodeTitle ?? "未命名"}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>场景数</p>
              <p className={metaValueClass}>{project.currentStoryboard.sceneCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>段落数</p>
              <p className={metaValueClass}>{project.currentStoryboard.segmentCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>总时长</p>
              <p className={metaValueClass}>
                {formatDuration(project.currentStoryboard.totalDurationSec)}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>
                {new Date(project.currentStoryboard.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </div>
      )}

      {project.currentStoryboard && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-semibold text-(--color-text-primary)">分镜详情</h4>
              <p className="text-sm text-(--color-text-muted) mt-1">
                当前分镜的完整只读内容，便于在项目详情页直接查看。
              </p>
            </div>
          </div>

          {detailLoading && (
            <div className="py-6">
              <p className="text-sm text-(--color-text-muted)">正在加载分镜详情...</p>
            </div>
          )}

          {detailError && !detailLoading && (
            <ErrorState
              error={detailError}
              retry={() => {
                setDetailError(null);
                setCurrentStoryboard(null);
                setDetailRequestVersion((value) => value + 1);
              }}
            />
          )}

          {currentStoryboard && !detailLoading && !detailError && (
            <div className="grid gap-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className={metaLabelClass}>标题</p>
                  <p className={`${metaValueClass} text-base font-semibold`}>
                    {currentStoryboard.title ?? "未命名"}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>集标题</p>
                  <p className={metaValueClass}>{currentStoryboard.episodeTitle ?? "未命名"}</p>
                </div>
              </div>

              {scenes.length > 1 && (
                <nav aria-label="Scene 导航" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-(--color-bg-base) border border-(--color-border-muted) p-1.5">
                  {scenes.map((scene, index) => {
                    const isActive = index === activeSceneIndex;
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => setActiveSceneIndex(index)}
                        className={[
                          "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) shadow-sm"
                            : "text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated)",
                        ].join(" ")}
                      >
                        {scene.name || `场景 ${scene.order}`}
                        <span
                          className={[
                            "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none min-w-5",
                            isActive
                              ? "bg-(--color-bg-base)/20 text-(--color-bg-base)"
                              : "bg-(--color-border-muted) text-(--color-text-muted)",
                          ].join(" ")}
                        >
                          {scene.segments.length}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}

              {scenes[activeSceneIndex] && (() => {
                const scene = scenes[activeSceneIndex];
                return (
                  <section
                    key={scene.id}
                    className="rounded-xl border border-(--color-border-muted) bg-(--color-bg-base) p-4"
                  >
                    <div className="grid gap-3">
                      <div>
                        <p className={metaLabelClass}>场景 {scene.order}</p>
                        <p className="text-base font-semibold text-(--color-text-primary)">
                          {scene.name}
                        </p>
                      </div>
                      <div>
                        <p className={metaLabelClass}>戏剧目的</p>
                        <p className="text-sm leading-7 text-(--color-text-primary)">
                          {scene.dramaticPurpose}
                        </p>
                      </div>

                      {scene.segments.map((segment) => (
                        <article
                          key={segment.id}
                          className="rounded-lg border border-(--color-border) bg-(--color-bg-surface) p-4"
                        >
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="text-sm font-semibold text-(--color-text-primary)">
                                段落 {segment.order}
                              </h5>
                              <span className="text-xs text-(--color-text-muted)">
                                时长：{formatDuration(segment.durationSec)}
                              </span>
                            </div>
                            <div>
                              <p className={metaLabelClass}>画面</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.visual}
                              </p>
                            </div>
                            <div>
                              <p className={metaLabelClass}>动作</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.characterAction}
                              </p>
                            </div>
                            <div>
                              <p className={metaLabelClass}>对白</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.dialogue || "无"}
                              </p>
                            </div>
                            <div>
                              <p className={metaLabelClass}>旁白</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.voiceOver || "无"}
                              </p>
                            </div>
                            <div>
                              <p className={metaLabelClass}>音频</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.audio || "无"}
                              </p>
                            </div>
                            <div>
                              <p className={metaLabelClass}>目的</p>
                              <p className="text-sm leading-7 text-(--color-text-primary)">
                                {segment.purpose}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
