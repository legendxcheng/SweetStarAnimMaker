import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  CurrentShotScript,
  SaveShotScriptRequest,
  ShotScriptReviewWorkspace,
} from "@sweet-star/shared";

import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";

function toEditableShotScript(shotScript: CurrentShotScript): SaveShotScriptRequest {
  return {
    title: shotScript.title,
    sourceStoryboardId: shotScript.sourceStoryboardId,
    sourceTaskId: shotScript.sourceTaskId,
    shots: shotScript.shots,
  };
}

function parseNextAction(value: string | null): "regenerate" | "edit_manually" | null {
  if (value === null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "regenerate" || normalized === "edit_manually") {
    return normalized;
  }

  return null;
}

export function ShotScriptReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<ShotScriptReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState<SaveShotScriptRequest | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadWorkspace = async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getShotScriptReviewWorkspace(projectId);
      setWorkspace(data);
      setDraft(toEditableShotScript(data.currentShotScript));
      setHasChanges(false);
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

  const updateDraft = <K extends keyof SaveShotScriptRequest>(
    field: K,
    value: SaveShotScriptRequest[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };

  const updateShot = <K extends keyof SaveShotScriptRequest["shots"][number]>(
    shotIndex: number,
    field: K,
    value: SaveShotScriptRequest["shots"][number][K],
  ) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        shots: prev.shots.map((shot, index) =>
          index === shotIndex ? { ...shot, [field]: value } : shot,
        ),
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!projectId || !draft) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.saveShotScript(projectId, draft);
      await loadWorkspace();
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!projectId) {
      return;
    }

    if (!confirm("确认要通过这个镜头脚本吗？")) {
      return;
    }

    try {
      setSubmittingAction(true);
      await apiClient.approveShotScript(projectId, {});
      alert("镜头脚本已通过！");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`通过失败：${(err as Error).message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!projectId) {
      return;
    }

    const reason = prompt("请输入驳回原因：");
    if (reason === null) {
      return;
    }

    const nextAction = parseNextAction(
      prompt("请输入后续动作（regenerate / edit_manually）："),
    );
    if (nextAction === null) {
      alert("驳回失败：后续动作必须是 regenerate 或 edit_manually");
      return;
    }

    try {
      setSubmittingAction(true);
      await apiClient.rejectShotScript(projectId, {
        reason,
        nextAction,
      });
      alert("镜头脚本已驳回。");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`驳回失败：${(err as Error).message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const inputClass =
    "w-full bg-(--color-bg-base) border border-(--color-border-muted) text-(--color-text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20";

  return (
    <div className="flex flex-col h-full -m-6">
      <AsyncState loading={loading} error={error} data={workspace}>
        {(ws) => {
          const currentDraft = draft ?? toEditableShotScript(ws.currentShotScript);

          return (
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
                  {hasChanges && ws.availableActions.save && (
                    <button
                      onClick={() => {
                        void handleSave();
                      }}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "保存中..." : "保存修改"}
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.approve && (
                    <button
                      onClick={() => {
                        void handleApprove();
                      }}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-(--color-success)/10 text-(--color-success) border border-(--color-success)/30 hover:bg-(--color-success)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      通过
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.reject && (
                    <button
                      onClick={() => {
                        void handleReject();
                      }}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-(--color-danger)/10 text-(--color-danger) border border-(--color-danger)/30 hover:bg-(--color-danger)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      驳回
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="shot-script-title-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    标题
                  </label>
                  <input
                    id="shot-script-title-input"
                    value={currentDraft.title ?? ""}
                    onChange={(event) => updateDraft("title", event.target.value || null)}
                    className={inputClass}
                  />
                </div>

                {currentDraft.shots.map((shot, index) => (
                  <section
                    key={shot.id}
                    className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-5"
                  >
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                        镜头 {shot.order}
                      </p>
                      <h2 className="text-base font-semibold text-(--color-text-primary) mt-1">
                        {shot.shotCode}
                      </h2>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`shot-code-${shot.id}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          镜头编号
                        </label>
                        <input
                          id={`shot-code-${shot.id}`}
                          value={shot.shotCode}
                          onChange={(event) => updateShot(index, "shotCode", event.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`shot-environment-${shot.id}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          环境
                        </label>
                        <input
                          id={`shot-environment-${shot.id}`}
                          value={shot.environment}
                          onChange={(event) =>
                            updateShot(index, "environment", event.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`shot-purpose-${shot.id}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          镜头目的
                        </label>
                        <textarea
                          id={`shot-purpose-${shot.id}`}
                          value={shot.shotPurpose}
                          onChange={(event) =>
                            updateShot(index, "shotPurpose", event.target.value)
                          }
                          rows={3}
                          className={`${inputClass} resize-y`}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`shot-motion-${shot.id}`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          镜头 {index + 1} 运动提示
                        </label>
                        <input
                          id={`shot-motion-${shot.id}`}
                          value={shot.motionHint ?? ""}
                          onChange={(event) =>
                            updateShot(index, "motionHint", event.target.value || null)
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </>
          );
        }}
      </AsyncState>
    </div>
  );
}
