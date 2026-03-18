import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../services/api-client";
import { AsyncState } from "../components/async-state";
import { PageHeader } from "../components/page-header";
import { StatusBadge } from "../components/status-badge";

interface StoryboardScene {
  id: string;
  sceneIndex: number;
  description: string;
  camera: string;
  characters: string[];
  prompt: string;
}

interface ReviewWorkspace {
  projectId: string;
  projectStatus: string;
  currentStoryboard: {
    id: string;
    versionNumber: number;
    kind: string;
    summary: string;
    scenes: StoryboardScene[];
  };
  latestReview: {
    action: string;
    reason: string | null;
  } | null;
  availableActions: {
    saveHumanVersion: boolean;
    approve: boolean;
    reject: boolean;
  };
}

export function ReviewWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<ReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editedScenes, setEditedScenes] = useState<StoryboardScene[]>([]);
  const [editedSummary, setEditedSummary] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] = useState<"regenerate" | "edit_manually">("regenerate");

  useEffect(() => {
    if (!projectId) return;

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getReviewWorkspace(projectId);
        setWorkspace(data as ReviewWorkspace);
        setEditedScenes((data as ReviewWorkspace).currentStoryboard.scenes);
        setEditedSummary((data as ReviewWorkspace).currentStoryboard.summary);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [projectId]);

  const handleSceneChange = (
    sceneIndex: number,
    field: keyof StoryboardScene,
    value: string
  ) => {
    setEditedScenes((prev) =>
      prev.map((scene) =>
        scene.sceneIndex === sceneIndex ? { ...scene, [field]: value } : scene
      )
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
      await apiClient.saveHumanVersion(projectId, {
        baseVersionId: workspace.currentStoryboard.id,
        summary: editedSummary,
        scenes: editedScenes,
      });
      setHasChanges(false);
      // Reload workspace
      const data = await apiClient.getReviewWorkspace(projectId);
      setWorkspace(data as ReviewWorkspace);
      setEditedScenes((data as ReviewWorkspace).currentStoryboard.scenes);
      setEditedSummary((data as ReviewWorkspace).currentStoryboard.summary);
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    }
  };

  const handleApprove = async () => {
    if (!workspace || !projectId) return;

    if (!confirm("Are you sure you want to approve this storyboard?")) {
      return;
    }

    try {
      await apiClient.approveStoryboard(projectId, {
        storyboardVersionId: workspace.currentStoryboard.id,
      });
      alert("Storyboard approved successfully!");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`Approve failed: ${(err as Error).message}`);
    }
  };

  const handleRejectSubmit = async () => {
    if (!workspace || !projectId) return;

    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      await apiClient.rejectStoryboard(projectId, {
        storyboardVersionId: workspace.currentStoryboard.id,
        reason: rejectReason,
        nextAction: rejectAction,
      });
      setShowRejectDialog(false);
      setRejectReason("");
      alert(`Storyboard rejected. ${rejectAction === "regenerate" ? "Regeneration task created." : "You can now edit manually."}`);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`Reject failed: ${(err as Error).message}`);
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
              <div style={{ marginBottom: "1rem", padding: "0.5rem", background: "#f5f5f5" }}>
                <strong>Latest Review:</strong> {ws.latestReview.action}
                {ws.latestReview.reason && (
                  <div>Reason: {ws.latestReview.reason}</div>
                )}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label>
                <strong>Summary:</strong>
                <textarea
                  value={editedSummary}
                  onChange={(e) => handleSummaryChange(e.target.value)}
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
                      onChange={(e) =>
                        handleSceneChange(scene.sceneIndex, "description", e.target.value)
                      }
                      style={{ width: "100%", minHeight: "60px" }}
                    />
                  </label>
                  <label>
                    Camera:
                    <input
                      type="text"
                      value={scene.camera}
                      onChange={(e) =>
                        handleSceneChange(scene.sceneIndex, "camera", e.target.value)
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label>
                    Prompt:
                    <textarea
                      value={scene.prompt}
                      onChange={(e) =>
                        handleSceneChange(scene.sceneIndex, "prompt", e.target.value)
                      }
                      style={{ width: "100%", minHeight: "60px" }}
                    />
                  </label>
                </div>
              ))}
            </div>

            {hasChanges && ws.availableActions.saveHumanVersion && (
              <button
                onClick={handleSave}
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 1rem",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  marginRight: "0.5rem",
                }}
              >
                Save Changes
              </button>
            )}

            {!hasChanges && (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                {ws.availableActions.approve && (
                  <button
                    onClick={handleApprove}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Approve
                  </button>
                )}

                {ws.availableActions.reject && (
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
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
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{ width: "100%", minHeight: "80px", marginTop: "0.5rem" }}
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
                            onChange={(e) => setRejectAction(e.target.value as "regenerate")}
                          />
                          {" "}Regenerate (create new AI version)
                        </label>
                        <label style={{ display: "block" }}>
                          <input
                            type="radio"
                            value="edit_manually"
                            checked={rejectAction === "edit_manually"}
                            onChange={(e) => setRejectAction(e.target.value as "edit_manually")}
                          />
                          {" "}Edit Manually (stay in review)
                        </label>
                      </div>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={handleRejectSubmit}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Submit Rejection
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectReason("");
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#6c757d",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
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
