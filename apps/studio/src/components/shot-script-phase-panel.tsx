import { useEffect, useState } from "react";
import type { CurrentShotScript, ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { Link } from "react-router-dom";

import { apiClient } from "../services/api-client";
import { ErrorState } from "./error-state";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface ShotScriptPhasePanelProps {
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

export function ShotScriptPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
}: ShotScriptPhasePanelProps) {
  const [currentShotScript, setCurrentShotScript] = useState<CurrentShotScript | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const [detailRequestVersion, setDetailRequestVersion] = useState(0);
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const generateLabel = project.currentShotScript ? "重新生成镜头脚本" : "生成镜头脚本";

  useEffect(() => {
    if (!project.currentShotScript) {
      setCurrentShotScript(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCurrentShotScript() {
      setDetailLoading(true);
      try {
        const detail = await apiClient.getCurrentShotScript(project.id);
        if (cancelled) {
          return;
        }
        setCurrentShotScript(detail);
        setDetailError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCurrentShotScript(null);
        setDetailError(error as Error);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadCurrentShotScript();

    return () => {
      cancelled = true;
    };
  }, [project.id, project.currentShotScript?.id, detailRequestVersion]);

  return (
    <section aria-label="镜头脚本工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">镜头脚本工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              基于已通过的分镜逐段生成镜头级拍摄脚本，作为后续视频阶段的输入。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creatingTask ? "启动中..." : generateLabel}
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

      {project.status === "shot_script_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">镜头脚本生成中，正在自动刷新项目状态。</p>
        </div>
      )}

      {project.currentShotScript && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="text-base font-semibold text-(--color-text-primary)">当前镜头脚本</h4>
            {project.status === "shot_script_in_review" && (
              <Link
                to={`/projects/${project.id}/shot-script/review`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity no-underline"
              >
                进入镜头脚本审核 →
              </Link>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className={metaLabelClass}>标题</p>
              <p className={`${metaValueClass} text-base font-semibold`}>
                {project.currentShotScript.title ?? "未命名"}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>镜头数</p>
              <p className={metaValueClass}>{project.currentShotScript.shotCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>段落数</p>
              <p className={metaValueClass}>{project.currentShotScript.segmentCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>总时长</p>
              <p className={metaValueClass}>
                {formatDuration(project.currentShotScript.totalDurationSec)}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>
                {new Date(project.currentShotScript.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </div>
      )}

      {project.currentShotScript && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-semibold text-(--color-text-primary)">段落详情</h4>
              <p className="text-sm text-(--color-text-muted) mt-1">
                当前镜头脚本按 Segment 分组展示，每个 Segment 内包含多个镜头。
              </p>
            </div>
          </div>

          {detailLoading && (
            <div className="py-6">
              <p className="text-sm text-(--color-text-muted)">正在加载镜头脚本详情...</p>
            </div>
          )}

          {detailError && !detailLoading && (
            <ErrorState
              error={detailError}
              retry={() => {
                setDetailError(null);
                setCurrentShotScript(null);
                setDetailRequestVersion((value) => value + 1);
              }}
            />
          )}

          {currentShotScript && !detailLoading && !detailError && (
            <div className="grid gap-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className={metaLabelClass}>标题</p>
                  <p className={`${metaValueClass} text-base font-semibold`}>
                    {currentShotScript.title ?? "未命名"}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>来源分镜</p>
                  <p className={metaValueClass}>{currentShotScript.sourceStoryboardId}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>段落数</p>
                  <p className={metaValueClass}>{currentShotScript.segmentCount}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>镜头数</p>
                  <p className={metaValueClass}>{currentShotScript.shotCount}</p>
                </div>
              </div>

              {currentShotScript.segments.map((segment) => (
                <article
                  key={segment.segmentId}
                  className="rounded-xl border border-(--color-border-muted) bg-(--color-bg-base) p-4"
                >
                  <div className="grid gap-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={metaLabelClass}>段落 {segment.order}</p>
                        <p className="text-base font-semibold text-(--color-text-primary)">
                          {segment.name ?? segment.segmentId}
                        </p>
                      </div>
                      <span className="text-xs text-(--color-text-muted)">
                        时长：{formatDuration(segment.durationSec)}
                      </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className={metaLabelClass}>场景 / 段落 ID</p>
                        <p className="text-sm leading-7 text-(--color-text-primary)">
                          {segment.sceneId} / {segment.segmentId}
                        </p>
                      </div>
                      <div>
                        <p className={metaLabelClass}>状态</p>
                        <p className="text-sm leading-7 text-(--color-text-primary)">
                          {segment.status}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className={metaLabelClass}>段落摘要</p>
                      <p className="text-sm leading-7 text-(--color-text-primary)">
                        {segment.summary}
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {segment.shots.map((shot) => (
                        <article
                          key={shot.id}
                          className="rounded-lg border border-(--color-border-muted) bg-(--color-bg-surface) p-4"
                        >
                          <div className="grid gap-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className={metaLabelClass}>镜头 {shot.order}</p>
                                <p className="text-base font-semibold text-(--color-text-primary)">
                                  {shot.shotCode}
                                </p>
                              </div>
                              <span className="text-xs text-(--color-text-muted)">
                                时长：{formatDuration(shot.durationSec)}
                              </span>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className={metaLabelClass}>镜头目的</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.purpose}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>主体</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.subject}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>画面</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.visual}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>动作</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.action}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>对白</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.dialogue || "无"}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>旁白 / OS</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.os || "无"}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>音频</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.audio || "无"}
                                </p>
                              </div>
                              <div>
                                <p className={metaLabelClass}>转场提示</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.transitionHint || "无"}
                                </p>
                              </div>
                              <div className="lg:col-span-2">
                                <p className={metaLabelClass}>连续性提示</p>
                                <p className="text-sm leading-7 text-(--color-text-primary)">
                                  {shot.continuityNotes || "无"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
