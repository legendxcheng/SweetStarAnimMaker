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
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!workspace || !projectId) return;
    if (!confirm("Are you sure you want to approve this master plot?")) return;
    try {
      setSubmittingAction(true);
      await apiClient.approveMasterPlot(projectId, {});
      alert("Master plot approved successfully!");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`Approve failed: ${(err as Error).message}`);
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
      alert("Please provide a reason for rejection");
      return;
    }
    try {
      setSubmittingAction(true);
      await apiClient.rejectMasterPlot(projectId, {
        reason: rejectReason.trim(),
      });
      closeRejectDialog();
      alert("Master plot rejected. Regeneration task created.");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`Reject failed: ${(err as Error).message}`);
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
                    ← Back
                  </button>
                  <span className="text-(--color-border-muted)">|</span>
                  <span className="text-sm font-semibold text-(--color-text-primary)">
                    Master Plot Review
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
                      {saving ? "Saving..." : "Save Changes"}
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
                      Approve
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.reject && (
                    <button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-(--color-danger)/10 text-(--color-danger) border border-(--color-danger)/30 hover:bg-(--color-danger)/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>

              {ws.latestReview && (
                <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-(--color-bg-surface) border border-(--color-border) text-sm text-(--color-text-muted) shrink-0">
                  <span className="font-medium text-(--color-text-primary)">Latest review:</span>{" "}
                  {ws.latestReview.action}
                  {ws.latestReview.reason && ` — ${ws.latestReview.reason}`}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="title-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    Title
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
                    Logline
                  </label>
                  <textarea
                    id="logline-input"
                    aria-label="Logline"
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
                    Synopsis
                  </label>
                  <textarea
                    id="synopsis-input"
                    aria-label="Synopsis"
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
                    Main Characters
                  </label>
                  <input
                    id="characters-input"
                    aria-label="Main Characters"
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
                    Core Conflict
                  </label>
                  <textarea
                    id="core-conflict-input"
                    aria-label="Core Conflict"
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
                    Emotional Arc
                  </label>
                  <textarea
                    id="emotional-arc-input"
                    aria-label="Emotional Arc"
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
                    Ending Beat
                  </label>
                  <textarea
                    id="ending-beat-input"
                    aria-label="Ending Beat"
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
                    Target Duration (sec)
                  </label>
                  <input
                    id="duration-input"
                    aria-label="Target Duration (sec)"
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
                      Reject Master Plot
                    </h3>

                    <div className="mb-5">
                      <label
                        htmlFor="reject-reason"
                        className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                      >
                        Reason
                      </label>
                      <textarea
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why you're rejecting this master plot..."
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
                        Submit Rejection
                      </button>
                      <button
                        onClick={closeRejectDialog}
                        disabled={submittingAction}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-(--color-bg-elevated) text-(--color-text-primary) border border-(--color-border-muted) hover:border-(--color-text-muted) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Cancel
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
