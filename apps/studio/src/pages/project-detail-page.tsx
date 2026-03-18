import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { ProjectDetail } from "@sweet-star/shared";
import { apiClient } from "../services/api-client";
import { AsyncState } from "../components/async-state";
import { PageHeader } from "../components/page-header";
import { StatusBadge } from "../components/status-badge";
import { ErrorState } from "../components/error-state";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<ProjectDetail>(
        `/projects/${projectId}`
      );
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Poll for updates when status is generating
  useEffect(() => {
    if (data?.status === "storyboard_generating") {
      const interval = setInterval(() => {
        loadProject();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [data?.status]);

  return (
    <div>
      <AsyncState
        data={data}
        loading={loading}
        error={error}
        errorFallback={(err) => <ErrorState error={err} retry={loadProject} />}
      >
        {(project) => (
          <>
            <PageHeader
              title={project.name}
              actions={
                <Link
                  to="/projects"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "white",
                    color: "#333",
                    textDecoration: "none",
                    border: "1px solid #e0e0e0",
                    borderRadius: "0.25rem",
                  }}
                >
                  Back to Projects
                </Link>
              }
            />

            <div
              style={{
                padding: "1.5rem",
                border: "1px solid #e0e0e0",
                borderRadius: "0.5rem",
                backgroundColor: "white",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <StatusBadge status={project.status} />
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div>
                  <strong>Project ID:</strong> {project.id}
                </div>
                <div>
                  <strong>Slug:</strong> {project.slug}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(project.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Updated:</strong>{" "}
                  {new Date(project.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {project.currentStoryboard && (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: "0.5rem",
                  backgroundColor: "white",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  Current Storyboard
                </h3>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <div>
                    <strong>Version:</strong> v{project.currentStoryboard.versionNumber}
                  </div>
                  <div>
                    <strong>Type:</strong> {project.currentStoryboard.kind}
                  </div>
                  <div>
                    <strong>Provider:</strong> {project.currentStoryboard.provider}
                  </div>
                  <div>
                    <strong>Model:</strong> {project.currentStoryboard.model}
                  </div>
                  <div>
                    <strong>Created:</strong>{" "}
                    {new Date(
                      project.currentStoryboard.createdAt
                    ).toLocaleString()}
                  </div>
                </div>

                {project.status === "storyboard_in_review" && (
                  <div style={{ marginTop: "1rem" }}>
                    <Link
                      to={`/projects/${project.id}/review`}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#2196F3",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "0.25rem",
                        display: "inline-block",
                      }}
                    >
                      Review Storyboard
                    </Link>
                  </div>
                )}
              </div>
            )}

            {project.status === "storyboard_generating" && (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #FF9800",
                  borderRadius: "0.5rem",
                  backgroundColor: "#FFF3E0",
                  color: "#E65100",
                }}
              >
                <p>Storyboard generation in progress... (auto-refreshing)</p>
              </div>
            )}
          </>
        )}
      </AsyncState>
    </div>
  );
}
