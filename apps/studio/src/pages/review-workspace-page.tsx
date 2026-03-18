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
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
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
                }}
              >
                Save Changes
              </button>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
