import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  CurrentMasterPlot,
  MasterPlotReviewWorkspace,
  SaveMasterPlotRequest,
} from "@sweet-star/shared";

import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";

function toEditableMasterPlot(masterPlot: CurrentMasterPlot): SaveMasterPlotRequest {
  return {
    title: masterPlot.title,
    logline: masterPlot.logline,
    synopsis: masterPlot.synopsis,
    mainCharacters: masterPlot.mainCharacters,
    coreConflict: masterPlot.coreConflict,
    emotionalArc: masterPlot.emotionalArc,
    endingBeat: masterPlot.endingBeat,
    targetDurationSec: masterPlot.targetDurationSec,
  };
}

function joinCharacters(characters: string[]) {
  return characters.join(", ");
}

function splitCharacters(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function MasterPlotReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<MasterPlotReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState<SaveMasterPlotRequest | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadWorkspace = async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getMasterPlotReviewWorkspace(projectId);
      setWorkspace(data);
      setDraft(toEditableMasterPlot(data.currentMasterPlot));
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

  const updateDraft = <K extends keyof SaveMasterPlotRequest>(
    field: K,
    value: SaveMasterPlotRequest[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!projectId || !draft) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.saveMasterPlot(projectId, draft);
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

    if (!confirm("确认要通过这个主情节吗？")) {
      return;
    }

    try {
      setSubmittingAction(true);
      await apiClient.approveMasterPlot(projectId, {});
      alert("主情节已通过！");
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

    try {
      setSubmittingAction(true);
      await apiClient.rejectMasterPlot(projectId, {
        reason,
      });
      alert("主情节已驳回，已创建重新生成任务。");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`驳回失败：${(err as Error).message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRegenerate = async () => {
    if (!projectId || hasChanges) {
      return;
    }

    const reason = prompt("请输入重新生成原因：");

    if (reason === null) {
      return;
    }

    try {
      setSubmittingAction(true);
      await apiClient.rejectMasterPlot(projectId, {
        reason,
      });
      alert("主情节已重新生成，已创建新任务。");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`重新生成失败：${(err as Error).message}`);
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
          const currentDraft = draft ?? toEditableMasterPlot(ws.currentMasterPlot);

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
                    主情节审核
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
                      className={getButtonClassName({ size: "compact" })}
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
                      className={getButtonClassName({
                        variant: "success",
                        size: "compact",
                      })}
                    >
                      通过
                    </button>
                  )}
                  {ws.availableActions.reject && (
                    <button
                      onClick={() => {
                        void handleRegenerate();
                      }}
                      disabled={submittingAction || hasChanges}
                      className={getButtonClassName({
                        variant: "warning",
                        size: "compact",
                      })}
                    >
                      重新生成
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.reject && (
                    <button
                      onClick={() => {
                        void handleReject();
                      }}
                      disabled={submittingAction}
                      className={getButtonClassName({
                        variant: "danger",
                        size: "compact",
                      })}
                    >
                      驳回
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="title-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    标题
                  </label>
                  <input
                    id="title-input"
                    value={currentDraft.title ?? ""}
                    onChange={(event) => updateDraft("title", event.target.value || null)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="logline-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    一句话梗概
                  </label>
                  <textarea
                    id="logline-input"
                    value={currentDraft.logline}
                    onChange={(event) => updateDraft("logline", event.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="characters-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    主要角色
                  </label>
                  <input
                    id="characters-input"
                    value={joinCharacters(currentDraft.mainCharacters)}
                    onChange={(event) =>
                      updateDraft("mainCharacters", splitCharacters(event.target.value))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="synopsis-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    剧情简介
                  </label>
                  <textarea
                    id="synopsis-input"
                    value={currentDraft.synopsis}
                    onChange={(event) => updateDraft("synopsis", event.target.value)}
                    rows={5}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="conflict-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    核心冲突
                  </label>
                  <textarea
                    id="conflict-input"
                    value={currentDraft.coreConflict}
                    onChange={(event) => updateDraft("coreConflict", event.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="arc-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    情感弧光
                  </label>
                  <textarea
                    id="arc-input"
                    value={currentDraft.emotionalArc}
                    onChange={(event) => updateDraft("emotionalArc", event.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ending-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    结局落点
                  </label>
                  <textarea
                    id="ending-input"
                    value={currentDraft.endingBeat}
                    onChange={(event) => updateDraft("endingBeat", event.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="duration-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    目标时长（秒）
                  </label>
                  <input
                    id="duration-input"
                    type="number"
                    value={currentDraft.targetDurationSec ?? ""}
                    onChange={(event) =>
                      updateDraft(
                        "targetDurationSec",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          );
        }}
      </AsyncState>
    </div>
  );
}
