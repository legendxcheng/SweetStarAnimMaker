import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  SaveShotScriptSegmentRequest,
  ShotScriptItem,
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
import { toSegmentDrafts } from "./shot-script-review-page/constants";
import { ShotScriptReviewSummary } from "./shot-script-review-page/shot-script-review-summary";
import { ShotScriptSceneNav } from "./shot-script-review-page/shot-script-scene-nav";
import { ShotScriptSegmentCard } from "./shot-script-review-page/shot-script-segment-card";

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
  const failedSegmentCount = useMemo(
    () => unapprovedSegments.filter((segment) => segment.status === "failed").length,
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
      if (current && sceneIds.includes(current)) {
        return current;
      }

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
              <ShotScriptReviewSummary
                workspace={ws}
                unapprovedSegments={unapprovedSegments}
                incompleteSegmentCount={incompleteSegmentCount}
                failedSegmentCount={failedSegmentCount}
              />

              <ShotScriptSceneNav
                sceneIds={sceneIds}
                activeSceneId={activeSceneId}
                sceneSegmentCounts={sceneSegmentCounts}
                onSelectScene={setActiveSceneId}
              />

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
                  <ShotScriptSegmentCard
                    key={segmentSelector}
                    segment={segment}
                    segmentStorageKey={segmentStorageKey}
                    draft={draft}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    isSubmitting={isSubmitting}
                    canSave={ws.availableActions.saveSegment}
                    canRegenerate={ws.availableActions.regenerateSegment}
                    canApprove={ws.availableActions.approveSegment}
                    onUpdateSegmentField={(field, value) =>
                      updateSegmentField(segmentSelector, field, value)
                    }
                    onUpdateShotField={(shotIndex, field, value) =>
                      updateShotField(segmentSelector, shotIndex, field, value)
                    }
                    onSave={() => {
                      void handleSaveSegment(segmentSelector);
                    }}
                    onRegenerate={() => {
                      void handleRegenerateSegment(segmentSelector);
                    }}
                    onApprove={() => {
                      void handleApproveSegment(segmentSelector);
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
