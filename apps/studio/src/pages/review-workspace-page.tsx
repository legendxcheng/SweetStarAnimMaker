import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  StoryboardReviewNextAction,
  StoryboardReviewWorkspace,
  StoryboardScene,
} from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { PageHeader } from "../components/page-header";
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
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] =
    useState<StoryboardReviewNextAction>("regenerate");

  const loadWorkspace = async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getReviewWorkspace(projectId);
      setWorkspace(data);
      setEditedScenes(data.currentStoryboard.scenes);
      setEditedSummary(data.currentStoryboard.summary);
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
    setEditedScenes((previousScenes) =>
      previousScenes.map((scene) =>
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
    if (!workspace || !projectId) {
      return;
    }

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
    if (!workspace || !projectId) {
      return;
    }

    if (!confirm("Are you sure you want to approve this storyboard?")) {
      return;
    }

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
    if (!workspace || !projectId) {
      return;
    }

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

  return (
    <div>
      <PageHeader
        title="Review Workspace"
        actions={
          <button onClick={() => navigate(`/projects/${projectId}`)}>
            Back to Project
          </button>
        }
      />

      <AsyncState loading={loading} error={error} data={workspace}>
        {(ws) => (
          <div style={{ padding: "1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Project Status:</strong>{" "}
              <StatusBadge status={ws.projectStatus} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Version:</strong> v{ws.currentStoryboard.versionNumber} (
              {ws.currentStoryboard.kind})
            </div>

            {ws.latestReview && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.5rem",
                  background: "#f5f5f5",
                }}
              >
                <strong>Latest Review:</strong> {ws.latestReview.action}
                {ws.latestReview.reason && <div>Reason: {ws.latestReview.reason}</div>}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label>
                <strong>Summary:</strong>
                <textarea
                  value={editedSummary}
                  onChange={(event) => handleSummaryChange(event.target.value)}
                  style={{ width: "100%", minHeight: "80px", marginTop: "0.5rem" }}
                />
              </label>
            </div>

            <div>
              <h3>Scenes</h3>
              {editedScenes.map((scene) => (
                <div
                  key={scene.id}
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid #ddd",
                  }}
                >
                  <h4>Scene {scene.sceneIndex}</h4>
                  <label>
                    Description:
                    <textarea
                      value={scene.description}
                      onChange={(event) =>
                        handleSceneChange(
                          scene.sceneIndex,
                          "description",
                          event.target.value,
                        )
                      }
                      style={{ width: "100%", minHeight: "60px" }}
                    />
                  </label>
                  <label>
                    Camera:
                    <input
                      type="text"
                      value={scene.camera}
                      onChange={(event) =>
                        handleSceneChange(scene.sceneIndex, "camera", event.target.value)
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label>
                    Prompt:
                    <textarea
                      value={scene.prompt}
                      onChange={(event) =>
                        handleSceneChange(scene.sceneIndex, "prompt", event.target.value)
                      }
                      style={{ width: "100%", minHeight: "60px" }}
                    />
                  </label>
                </div>
              ))}
            </div>

            {hasChanges && ws.availableActions.saveHumanVersion && (
              <button
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 1rem",
                  background: saving ? "#90caf9" : "#007bff",
                  color: "white",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  marginRight: "0.5rem",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}

            {!hasChanges && (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                {ws.availableActions.approve && (
                  <button
                    onClick={() => {
                      void handleApprove();
                    }}
                    disabled={submittingAction}
                    style={{
                      padding: "0.5rem 1rem",
                      background: submittingAction ? "#a5d6a7" : "#28a745",
                      color: "white",
                      border: "none",
                      cursor: submittingAction ? "not-allowed" : "pointer",
                    }}
                  >
                    Approve
                  </button>
                )}

                {ws.availableActions.reject && (
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={submittingAction}
                    style={{
                      padding: "0.5rem 1rem",
                      background: submittingAction ? "#ef9a9a" : "#dc3545",
                      color: "white",
                      border: "none",
                      cursor: submittingAction ? "not-allowed" : "pointer",
                    }}
                  >
                    Reject
                  </button>
                )}
              </div>
            )}

            {showRejectDialog && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: "2rem",
                    borderRadius: "0.5rem",
                    maxWidth: "500px",
                    width: "90%",
                  }}
                >
                  <h3>Reject Storyboard</h3>
                  <div style={{ marginBottom: "1rem" }}>
                    <label>
                      <strong>Reason:</strong>
                      <textarea
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          marginTop: "0.5rem",
                        }}
                        placeholder="Explain why you're rejecting this storyboard..."
                      />
                    </label>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label>
                      <strong>Next Action:</strong>
                      <div style={{ marginTop: "0.5rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem" }}>
                          <input
                            type="radio"
                            value="regenerate"
                            checked={rejectAction === "regenerate"}
                            onChange={(event) =>
                              setRejectAction(
                                event.target.value as StoryboardReviewNextAction,
                              )
                            }
                          />{" "}
                          Regenerate (create new AI version)
                        </label>
                        <label style={{ display: "block" }}>
                          <input
                            type="radio"
                            value="edit_manually"
                            checked={rejectAction === "edit_manually"}
                            onChange={(event) =>
                              setRejectAction(
                                event.target.value as StoryboardReviewNextAction,
                              )
                            }
                          />{" "}
                          Edit Manually (stay in review)
                        </label>
                      </div>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        void handleRejectSubmit();
                      }}
                      disabled={submittingAction}
                      style={{
                        padding: "0.5rem 1rem",
                        background: submittingAction ? "#ef9a9a" : "#dc3545",
                        color: "white",
                        border: "none",
                        cursor: submittingAction ? "not-allowed" : "pointer",
                      }}
                    >
                      Submit Rejection
                    </button>
                    <button
                      onClick={closeRejectDialog}
                      disabled={submittingAction}
                      style={{
                        padding: "0.5rem 1rem",
                        background: submittingAction ? "#cfd8dc" : "#6c757d",
                        color: "white",
                        border: "none",
                        cursor: submittingAction ? "not-allowed" : "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
