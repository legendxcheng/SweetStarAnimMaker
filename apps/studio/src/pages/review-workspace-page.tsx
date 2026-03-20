import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CurrentMasterPlot, MasterPlotReviewWorkspace } from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";

type EditableMasterPlot = Omit<
  CurrentMasterPlot,
  "id" | "sourceTaskId" | "updatedAt" | "approvedAt"
>;

function toEditableMasterPlot(masterPlot: CurrentMasterPlot): EditableMasterPlot {
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

function serializeCharacterList(value: string[]) {
  return value.join(", ");
}

function parseCharacterList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const REVIEW_ACTION_LABELS = {
  approve: "通过",
  reject: "驳回",
} as const;

export function ReviewWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<MasterPlotReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState<EditableMasterPlot | null>(null);
  const [charactersText, setCharactersText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadWorkspace = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await apiClient.getReviewWorkspace(projectId);
      const editable = toEditableMasterPlot(data.currentMasterPlot);

      setWorkspace(data);
      setDraft(editable);
      setCharactersText(serializeCharacterList(editable.mainCharacters));
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

  const updateDraft = <K extends keyof EditableMasterPlot>(
    field: K,
    value: EditableMasterPlot[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!workspace || !projectId || !draft) return;
    try {
      setSaving(true);
      await apiClient.saveMasterPlot(projectId, {
        ...draft,
        mainCharacters: parseCharacterList(charactersText),
      });
      await loadWorkspace();
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!workspace || !projectId) return;
    if (!confirm("确认要通过这个主情节吗？")) return;
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

  const closeRejectDialog = () => {
    setShowRejectDialog(false);
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!workspace || !projectId) return;
    if (!rejectReason.trim()) {
      alert("请填写驳回原因");
      return;
    }
    try {
      setSubmittingAction(true);
      await apiClient.rejectMasterPlot(projectId, {
        reason: rejectReason.trim(),
      });
      closeRejectDialog();
      alert("主情节已驳回，已创建重新生成任务。");
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
                  <span className="text-sm font-semibold text-(--color-text-primary)">
                    主情节审核
                  </span>
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
                      onClick={() => setShowRejectDialog(true)}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-(--color-danger)/10 text-(--color-danger) border border-(--color-danger)/30 hover:bg-(--color-danger)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      驳回
                    </button>
                  )}
                </div>
              </div>

              {ws.latestReview && (
                <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-(--color-bg-surface) border border-(--color-border) text-sm text-(--color-text-muted) shrink-0">
                  <span className="font-medium text-(--color-text-primary)">最新审核：</span>
                  {REVIEW_ACTION_LABELS[ws.latestReview.action]}
                  {ws.latestReview.reason && `：${ws.latestReview.reason}`}
                </div>
              )}

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
                    onChange={(e) => updateDraft("title", e.target.value || null)}
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
                    aria-label="一句话梗概"
                    value={currentDraft.logline}
                    onChange={(e) => updateDraft("logline", e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-y`}
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
                    aria-label="剧情简介"
                    value={currentDraft.synopsis}
                    onChange={(e) => updateDraft("synopsis", e.target.value)}
                    rows={5}
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
                    aria-label="主要角色"
                    value={charactersText}
                    onChange={(e) => {
                      setCharactersText(e.target.value);
                      setHasChanges(true);
                    }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="core-conflict-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    核心冲突
                  </label>
                  <textarea
                    id="core-conflict-input"
                    aria-label="核心冲突"
                    value={currentDraft.coreConflict}
                    onChange={(e) => updateDraft("coreConflict", e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="emotional-arc-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    情感弧线
                  </label>
                  <textarea
                    id="emotional-arc-input"
                    aria-label="情感弧线"
                    value={currentDraft.emotionalArc}
                    onChange={(e) => updateDraft("emotionalArc", e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ending-beat-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    结局节点
                  </label>
                  <textarea
                    id="ending-beat-input"
                    aria-label="结局节点"
                    value={currentDraft.endingBeat}
                    onChange={(e) => updateDraft("endingBeat", e.target.value)}
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
                    aria-label="目标时长（秒）"
                    type="number"
                    value={currentDraft.targetDurationSec ?? ""}
                    onChange={(e) =>
                      updateDraft(
                        "targetDurationSec",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {showRejectDialog && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 w-full max-w-md mx-4">
                    <h3 className="text-base font-semibold text-(--color-text-primary) mb-4">
                      驳回主情节
                    </h3>

                    <div className="mb-5">
                      <label
                        htmlFor="reject-reason"
                        className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                      >
                        原因
                      </label>
                      <textarea
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="请说明驳回原因..."
                        className={`${inputClass} resize-y`}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          void handleRejectSubmit();
                        }}
                        disabled={submittingAction}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-(--color-danger)/10 text-(--color-danger) border border-(--color-danger)/30 hover:bg-(--color-danger)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        提交驳回
                      </button>
                      <button
                        onClick={closeRejectDialog}
                        disabled={submittingAction}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-(--color-bg-elevated) text-(--color-text-primary) border border-(--color-border-muted) hover:border-(--color-text-muted) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </AsyncState>
    </div>
  );
}
