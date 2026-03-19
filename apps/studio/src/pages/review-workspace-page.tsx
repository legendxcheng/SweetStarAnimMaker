import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  StoryboardReviewNextAction,
  StoryboardReviewWorkspace,
  StoryboardScene,
} from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";

export function ReviewWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<StoryboardReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editedScenes, setEditedScenes] = useState<StoryboardScene[]>([]);
  const [editedSummary, setEditedSummary] = useState("");
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] =
    useState<StoryboardReviewNextAction>("regenerate");

  const loadWorkspace = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await apiClient.getReviewWorkspace(projectId);
      setWorkspace(data);
      setEditedScenes(data.currentStoryboard.scenes);
      setEditedSummary(data.currentStoryboard.summary);
      setSelectedSceneIndex(0);
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

  const handleSceneChange = (
    sceneIndex: number,
    field: keyof StoryboardScene,
    value: string,
  ) => {
    setEditedScenes((prev) =>
      prev.map((scene) =>
        scene.sceneIndex === sceneIndex ? { ...scene, [field]: value } : scene,
      ),
    );
    setHasChanges(true);
  };

  const handleSummaryChange = (value: string) => {
    setEditedSummary(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!workspace || !projectId) return;
    try {
      setSaving(true);
      await apiClient.saveHumanVersion(projectId, {
        baseVersionId: workspace.currentStoryboard.id,
        summary: editedSummary,
        scenes: editedScenes,
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
    if (!confirm("Are you sure you want to approve this storyboard?")) return;
    try {
      setSubmittingAction(true);
      await apiClient.approveStoryboard(projectId, {
        storyboardVersionId: workspace.currentStoryboard.id,
      });
      alert("Storyboard approved successfully!");
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
      await apiClient.rejectStoryboard(projectId, {
        storyboardVersionId: workspace.currentStoryboard.id,
        reason: rejectReason.trim(),
        nextAction: rejectAction,
      });
      closeRejectDialog();
      alert(
        `Storyboard rejected. ${
          rejectAction === "regenerate"
            ? "Regeneration task created."
            : "You can now edit manually."
        }`,
      );
      if (rejectAction === "regenerate") {
        navigate(`/projects/${projectId}`);
        return;
      }
      await loadWorkspace();
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
          const selectedScene =
            editedScenes.find((s) => s.sceneIndex === selectedSceneIndex + 1) ??
            editedScenes[0];

          return (
            <>
              {/* Top toolbar */}
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
                    Review Workspace
                  </span>
                  <StatusBadge status={ws.projectStatus} />
                  <span className="text-xs text-(--color-text-muted) bg-(--color-bg-surface) border border-(--color-border) px-2 py-0.5 rounded-md">
                    v{ws.currentStoryboard.versionNumber} · {ws.currentStoryboard.kind}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && ws.availableActions.saveHumanVersion && (
                    <button
                      onClick={() => { void handleSave(); }}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.approve && (
                    <button
                      onClick={() => { void handleApprove(); }}
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

              {/* Latest review notice */}
              {ws.latestReview && (
                <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-(--color-bg-surface) border border-(--color-border) text-sm text-(--color-text-muted) shrink-0">
                  <span className="font-medium text-(--color-text-primary)">
                    Latest review:
                  </span>{" "}
                  {ws.latestReview.action}
                  {ws.latestReview.reason && ` — ${ws.latestReview.reason}`}
                </div>
              )}

              {/* Split layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Scene list */}
                <div className="w-72 shrink-0 border-r border-(--color-border) overflow-y-auto p-3 flex flex-col gap-2 bg-(--color-bg-surface)">
                  <p className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide px-2 mb-1">
                    Scenes
                  </p>
                  {editedScenes.map((scene, idx) => (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedSceneIndex(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        idx === selectedSceneIndex
                          ? "border-(--color-accent)/40 bg-(--color-accent)/10"
                          : "border-(--color-border) bg-(--color-bg-surface) hover:border-(--color-border-muted)"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold mb-0.5 ${
                          idx === selectedSceneIndex
                            ? "text-(--color-accent)"
                            : "text-(--color-text-primary)"
                        }`}
                      >
                        Scene {scene.sceneIndex}
                      </p>
                      <p className="text-xs text-(--color-text-muted) truncate">
                        {scene.description}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Edit panel */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                  {/* Summary — always visible */}
                  <div>
                    <label
                      htmlFor="summary-input"
                      className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                    >
                      Summary:
                    </label>
                    <textarea
                      id="summary-input"
                      aria-label="Summary:"
                      value={editedSummary}
                      onChange={(e) => handleSummaryChange(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {/* Per-scene fields */}
                  {selectedScene && (
                    <>
                      <div className="flex items-center gap-2 border-t border-(--color-border) pt-4">
                        <span className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                          Scene {selectedScene.sceneIndex}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor="scene-description"
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          Description:
                        </label>
                        <textarea
                          id="scene-description"
                          aria-label="Description:"
                          value={selectedScene.description}
                          onChange={(e) =>
                            handleSceneChange(
                              selectedScene.sceneIndex,
                              "description",
                              e.target.value,
                            )
                          }
                          rows={3}
                          className={`${inputClass} resize-y`}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="scene-camera"
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          Camera:
                        </label>
                        <input
                          id="scene-camera"
                          type="text"
                          value={selectedScene.camera}
                          onChange={(e) =>
                            handleSceneChange(
                              selectedScene.sceneIndex,
                              "camera",
                              e.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="scene-prompt"
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          Prompt:
                        </label>
                        <textarea
                          id="scene-prompt"
                          value={selectedScene.prompt}
                          onChange={(e) =>
                            handleSceneChange(
                              selectedScene.sceneIndex,
                              "prompt",
                              e.target.value,
                            )
                          }
                          rows={3}
                          className={`${inputClass} resize-y`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Reject dialog */}
              {showRejectDialog && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6 w-full max-w-md mx-4">
                    <h3 className="text-base font-semibold text-(--color-text-primary) mb-4">
                      Reject Storyboard
                    </h3>

                    <div className="mb-4">
                      <label
                        htmlFor="reject-reason"
                        className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                      >
                        Reason:
                      </label>
                      <textarea
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why you're rejecting this storyboard..."
                        className={`${inputClass} resize-y`}
                      />
                    </div>

                    <div className="mb-5">
                      <p className="text-sm font-medium text-(--color-text-primary) mb-2">
                        Next Action:
                      </p>
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="radio"
                          value="regenerate"
                          checked={rejectAction === "regenerate"}
                          onChange={(e) =>
                            setRejectAction(e.target.value as StoryboardReviewNextAction)
                          }
                          className="accent-(--color-accent)"
                        />
                        <span className="text-sm text-(--color-text-primary)">
                          Regenerate (create new AI version)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="edit_manually"
                          checked={rejectAction === "edit_manually"}
                          onChange={(e) =>
                            setRejectAction(e.target.value as StoryboardReviewNextAction)
                          }
                          className="accent-(--color-accent)"
                        />
                        <span className="text-sm text-(--color-text-primary)">
                          Edit Manually (stay in review)
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { void handleRejectSubmit(); }}
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
