import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  SaveShotScriptSegmentRequest,
  ShotFrameDependency,
  ShotScriptItem,
  ShotScriptSegment,
  ShotScriptReviewWorkspace,
} from "@sweet-star/shared";
import {
  toShotScriptSegmentSelector,
  toShotScriptSegmentStorageKey,
} from "@sweet-star/shared";

import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";

const shotFrameDependencyOptions: Array<{
  value: ShotFrameDependency;
  label: string;
}> = [
  { value: "start_frame_only", label: "首帧即可" },
  { value: "start_and_end_frame", label: "需要首尾帧" },
];

function toSegmentDrafts(workspace: ShotScriptReviewWorkspace) {
  return Object.fromEntries(
    workspace.currentShotScript.segments.map((segment) => [
      toShotScriptSegmentSelector(segment),
      {
        name: segment.name,
        summary: segment.summary,
        durationSec: segment.durationSec,
        shots: segment.shots,
      } satisfies SaveShotScriptSegmentRequest,
    ]),
  ) as Record<string, SaveShotScriptSegmentRequest>;
}

function getSegmentReviewLabel(segment: ShotScriptSegment) {
  if (segment.status === "approved") {
    return "已通过";
  }

  if (segment.status === "pending" || segment.status === "generating" || segment.shots.length === 0) {
    return "未生成完成";
  }

  return "待通过";
}

export function ShotScriptReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<ShotScriptReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SaveShotScriptSegmentRequest>>({});
  const [dirtySegmentIds, setDirtySegmentIds] = useState<string[]>([]);
  const [savingSegmentId, setSavingSegmentId] = useState<string | null>(null);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingUnapproved, setRegeneratingUnapproved] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const loadWorkspace = async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getShotScriptReviewWorkspace(projectId);
      setWorkspace(data);
      setDrafts(toSegmentDrafts(data));
      setDirtySegmentIds([]);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [projectId]);

  const hasDirtySegments = dirtySegmentIds.length > 0;

  const orderedSegments = useMemo(() => workspace?.currentShotScript.segments ?? [], [workspace]);
  const hasIncompleteSegments = useMemo(
    () => orderedSegments.some((segment) => segment.status === "pending" || segment.shots.length === 0),
    [orderedSegments],
  );
  const unapprovedSegments = useMemo(
    () => orderedSegments.filter((segment) => segment.status !== "approved"),
    [orderedSegments],
  );
  const incompleteSegmentCount = useMemo(
    () =>
      unapprovedSegments.filter(
        (segment) =>
          segment.status === "pending" ||
          segment.status === "generating" ||
          segment.shots.length === 0,
      ).length,
    [unapprovedSegments],
  );
  const regenerateUnapprovedDisabled =
    regeneratingUnapproved ||
    regeneratingAll ||
    approvingAll ||
    hasDirtySegments;

  const sceneIds = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const seg of orderedSegments) {
      if (!seen.has(seg.sceneId)) {
        seen.add(seg.sceneId);
        ordered.push(seg.sceneId);
      }
    }
    return ordered;
  }, [orderedSegments]);

  const sceneSegmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const seg of orderedSegments) {
      counts.set(seg.sceneId, (counts.get(seg.sceneId) ?? 0) + 1);
    }
    return counts;
  }, [orderedSegments]);

  useEffect(() => {
    if (sceneIds.length === 0) {
      setActiveSceneId(null);
      return;
    }
    setActiveSceneId((current) => {
      if (current && sceneIds.includes(current)) return current;
      return sceneIds[0];
    });
  }, [sceneIds]);

  const activeOrderedSegments = useMemo(
    () => orderedSegments.filter((seg) => seg.sceneId === activeSceneId),
    [orderedSegments, activeSceneId],
  );

  const updateSegmentField = <K extends keyof SaveShotScriptSegmentRequest>(
    segmentId: string,
    field: K,
    value: SaveShotScriptSegmentRequest[K],
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        [field]: value,
      },
    }));
    setDirtySegmentIds((prev) => (prev.includes(segmentId) ? prev : [...prev, segmentId]));
  };

  const updateShotField = <K extends keyof ShotScriptItem>(
    segmentId: string,
    shotIndex: number,
    field: K,
    value: ShotScriptItem[K],
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        shots: prev[segmentId].shots.map((shot, index) =>
          index === shotIndex ? { ...shot, [field]: value } : shot,
        ),
      },
    }));
    setDirtySegmentIds((prev) => (prev.includes(segmentId) ? prev : [...prev, segmentId]));
  };

  const handleSaveSegment = async (segmentId: string) => {
    if (!projectId) {
      return;
    }

    try {
      setSavingSegmentId(segmentId);
      await apiClient.saveShotScriptSegment(projectId, segmentId, drafts[segmentId]!);
      await loadWorkspace();
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    } finally {
      setSavingSegmentId(null);
    }
  };

  const handleApproveSegment = async (segmentId: string) => {
    if (!projectId) {
      return;
    }

    if (!confirm("确认通过这个段落的镜头脚本吗？")) {
      return;
    }

    try {
      setSubmittingActionId(segmentId);
      const result = await apiClient.approveShotScriptSegment(projectId, segmentId, {});

      if (result.approvedAt) {
        navigate(`/projects/${projectId}`);
        return;
      }

      await loadWorkspace();
    } catch (err) {
      alert(`通过失败：${(err as Error).message}`);
    } finally {
      setSubmittingActionId(null);
    }
  };

  const handleRegenerateSegment = async (segmentId: string) => {
    if (!projectId) {
      return;
    }

    if (!confirm("确认重生成这个段落的镜头脚本吗？")) {
      return;
    }

    try {
      setSubmittingActionId(segmentId);
      await apiClient.regenerateShotScriptSegment(projectId, segmentId, {});
      await loadWorkspace();
    } catch (err) {
      alert(`重生成失败：${(err as Error).message}`);
    } finally {
      setSubmittingActionId(null);
    }
  };

  const handleApproveAll = async () => {
    if (!projectId) {
      return;
    }

    if (!confirm("确认全部通过当前镜头脚本段落吗？")) {
      return;
    }

    try {
      setApprovingAll(true);
      const result = await apiClient.approveAllShotScriptSegments(projectId, {});

      if (result.approvedAt) {
        navigate(`/projects/${projectId}`);
        return;
      }

      await loadWorkspace();
    } catch (err) {
      alert(`全部通过失败：${(err as Error).message}`);
    } finally {
      setApprovingAll(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!projectId) {
      return;
    }

    if (!confirm("确认要重新生成整个镜头脚本吗？")) {
      return;
    }

    try {
      setRegeneratingAll(true);
      await apiClient.regenerateShotScript(projectId);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`重新生成失败：${(err as Error).message}`);
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleRegenerateUnapprovedSegments = async () => {
    if (!projectId) {
      return;
    }

    if (unapprovedSegments.length === 0) {
      return;
    }

    if (!confirm("确认要重新生成所有未通过段落吗？已通过段落会保持不变。")) {
      return;
    }

    try {
      setRegeneratingUnapproved(true);
      await apiClient.createShotScriptGenerateTask(projectId);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`重新生成失败：${(err as Error).message}`);
    } finally {
      setRegeneratingUnapproved(false);
    }
  };

  const inputClass =
    "w-full bg-(--color-bg-base) border border-(--color-border-muted) text-(--color-text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20";
  const textareaClass = `${inputClass} resize-y`;

  return (
    <div className="flex flex-col h-full -m-6">
      <AsyncState loading={loading} error={error} data={workspace}>
        {(ws) => (
          <>
            <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-3 bg-(--color-bg-base) shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="text-sm text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
                >
                  ← 返回
                </button>
                <span className="text-(--color-border-muted)">|</span>
                <h1 className="text-sm font-semibold text-(--color-text-primary)">
                  镜头脚本审核
                </h1>
                <StatusBadge status={ws.projectStatus} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    void handleRegenerateUnapprovedSegments();
                  }}
                  disabled={regenerateUnapprovedDisabled}
                  className={getButtonClassName({
                    variant: "warning",
                    size: "compact",
                  })}
                >
                  {regeneratingUnapproved ? "处理中..." : "重新生成未通过段落"}
                </button>
                <button
                  onClick={() => {
                    void handleRegenerateAll();
                  }}
                  disabled={
                    regeneratingAll ||
                    regeneratingUnapproved ||
                    approvingAll ||
                    hasDirtySegments
                  }
                  className={getButtonClassName({
                    variant: "warning",
                    size: "compact",
                  })}
                >
                  重新生成
                </button>
                {ws.availableActions.approveAll && !hasIncompleteSegments && (
                  <button
                    onClick={() => {
                      void handleApproveAll();
                    }}
                    disabled={
                      approvingAll ||
                      regeneratingAll ||
                      regeneratingUnapproved ||
                      hasDirtySegments
                    }
                    className={getButtonClassName({
                      variant: "success",
                      size: "compact",
                    })}
                  >
                    {approvingAll ? "提交中..." : "全部通过"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                      标题
                    </p>
                    <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
                      {ws.currentShotScript.title ?? "未命名"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                      Segment 数
                    </p>
                    <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
                      {ws.currentShotScript.segmentCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                      Shot 数
                    </p>
                    <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
                      {ws.currentShotScript.shotCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                      更新时间
                    </p>
                    <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
                      {new Date(ws.currentShotScript.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>

                {unapprovedSegments.length > 0 && (
                  <div className="mt-5 rounded-lg border border-(--color-warning)/30 bg-(--color-warning)/8 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-(--color-text-primary)">
                          还有 {unapprovedSegments.length} 个段落未通过
                        </p>
                        <p className="mt-1 text-xs text-(--color-text-muted)">
                          {incompleteSegmentCount > 0
                            ? `其中 ${incompleteSegmentCount} 个段落未生成完成，全部通过按钮会继续隐藏。`
                            : "当前都已生成完成，但仍需逐段通过。"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {unapprovedSegments.map((segment) => (
                        <div
                          key={toShotScriptSegmentSelector(segment)}
                          className="rounded-lg border border-(--color-border) bg-(--color-bg-surface) px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-(--color-text-primary)">
                              {segment.sceneId} / {segment.segmentId}
                            </p>
                            <span className="rounded-full bg-(--color-bg-base) px-2 py-0.5 text-xs font-medium text-(--color-text-muted)">
                              {getSegmentReviewLabel(segment)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-(--color-text-muted)">
                            {segment.name ?? segment.summary ?? segment.segmentId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {sceneIds.length > 1 && (
                <nav aria-label="Scene 导航" className="shrink-0 rounded-xl bg-(--color-bg-surface) border border-(--color-border) p-1.5 flex gap-1 overflow-x-auto overflow-y-hidden">
                  {sceneIds.map((sceneId) => {
                    const isActive = sceneId === activeSceneId;
                    const count = sceneSegmentCounts.get(sceneId) ?? 0;
                    return (
                      <button
                        key={sceneId}
                        type="button"
                        onClick={() => setActiveSceneId(sceneId)}
                        className={[
                          "relative shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) shadow-sm"
                            : "text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated)",
                        ].join(" ")}
                      >
                        {sceneId}
                        <span
                          className={[
                            "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none min-w-5",
                            isActive
                              ? "bg-(--color-bg-base)/20 text-(--color-bg-base)"
                              : "bg-(--color-border-muted) text-(--color-text-muted)",
                          ].join(" ")}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}

              {activeOrderedSegments.map((segment) => {
                const segmentSelector = toShotScriptSegmentSelector(segment);
                const segmentStorageKey = toShotScriptSegmentStorageKey(segment);
                const draft = drafts[segmentSelector] ?? {
                  name: segment.name,
                  summary: segment.summary,
                  durationSec: segment.durationSec,
                  shots: segment.shots,
                };
                const isDirty = dirtySegmentIds.includes(segmentSelector);
                const isSaving = savingSegmentId === segmentSelector;
                const isSubmitting = submittingActionId === segmentSelector;

                return (
                  <section
                    key={segmentSelector}
                    className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                          Segment {segment.order}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-(--color-text-primary)">
                          {segment.name ?? segment.segmentId}
                        </h2>
                        <p className="mt-1 text-sm text-(--color-text-muted)">
                          Scene {segment.sceneId} / Segment {segment.segmentId} / 当前状态 {segment.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDirty && ws.availableActions.saveSegment && (
                          <button
                            onClick={() => {
                              void handleSaveSegment(segmentSelector);
                            }}
                            disabled={isSaving}
                            className={getButtonClassName({ size: "compact" })}
                          >
                            {isSaving ? "保存中..." : "保存本段"}
                          </button>
                        )}
                        {!isDirty && ws.availableActions.regenerateSegment && (
                          <button
                            onClick={() => {
                              void handleRegenerateSegment(segmentSelector);
                            }}
                            disabled={isSubmitting}
                            className={getButtonClassName({
                              variant: "warning",
                              size: "compact",
                            })}
                          >
                            重生成本段
                          </button>
                        )}
                        {!isDirty && ws.availableActions.approveSegment && (
                          <button
                            onClick={() => {
                              void handleApproveSegment(segmentSelector);
                            }}
                            disabled={isSubmitting}
                            className={getButtonClassName({
                              variant: "success",
                              size: "compact",
                            })}
                          >
                            通过本段
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2 mb-5">
                      <div>
                        <label
                          htmlFor={`segment-name-${segmentStorageKey}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          段落 {segment.order} 标题
                        </label>
                        <input
                          id={`segment-name-${segmentStorageKey}`}
                          value={draft.name ?? ""}
                          onChange={(event) =>
                            updateSegmentField(
                              segmentSelector,
                              "name",
                              event.target.value || null,
                            )
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`segment-duration-${segmentStorageKey}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          段落 {segment.order} 时长（秒）
                        </label>
                        <input
                          id={`segment-duration-${segmentStorageKey}`}
                          type="number"
                          value={draft.durationSec ?? ""}
                          onChange={(event) =>
                            updateSegmentField(
                              segmentSelector,
                              "durationSec",
                              event.target.value ? Number(event.target.value) : null,
                            )
                          }
                          className={inputClass}
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`segment-summary-${segmentStorageKey}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          段落 {segment.order} 摘要
                        </label>
                        <textarea
                          id={`segment-summary-${segmentStorageKey}`}
                          value={draft.summary}
                          onChange={(event) =>
                            updateSegmentField(segmentSelector, "summary", event.target.value)
                          }
                          rows={3}
                          className={textareaClass}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {draft.shots.map((shot, shotIndex) => (
                        <article
                          key={shot.id}
                          className="rounded-lg border border-(--color-border-muted) bg-(--color-bg-base) p-4"
                        >
                          <div className="mb-4">
                            <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                              镜头 {shot.order}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-(--color-text-primary)">
                              {shot.shotCode}
                            </p>
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "shotCode",
                                    event.target.value,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "purpose",
                                    event.target.value,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "subject",
                                    event.target.value,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "visual",
                                    event.target.value,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "action",
                                    event.target.value,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "dialogue",
                                    event.target.value || null,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "os",
                                    event.target.value || null,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
                                    shotIndex,
                                    "audio",
                                    event.target.value || null,
                                  )
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
                                  updateShotField(
                                    segmentSelector,
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
                                  updateShotField(
                                    segmentSelector,
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
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
