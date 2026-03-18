import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ProjectSummary } from "@sweet-star/shared";
import { apiClient } from "../services/api-client";
import { AsyncState } from "../components/async-state";
import { PageHeader } from "../components/page-header";
import { StatusBadge } from "../components/status-badge";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";

interface ProjectListResponse {
  projects: ProjectSummary[];
}

export function ProjectsPage() {
  const [data, setData] = useState<ProjectListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<ProjectListResponse>("/projects");
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div>
      <PageHeader
        title="Projects"
        actions={
          <Link
            to="/projects/new"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2196F3",
              color: "white",
              textDecoration: "none",
              borderRadius: "0.25rem",
            }}
          >
            New Project
          </Link>
        }
      />

      <AsyncState
        data={data}
        loading={loading}
        error={error}
        errorFallback={(err) => <ErrorState error={err} retry={loadProjects} />}
      >
        {(response) =>
          response.projects.length === 0 ? (
            <EmptyState
              message="No projects yet. Create your first project to get started."
              action={
                <Link
                  to="/projects/new"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#2196F3",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "0.25rem",
                  }}
                >
                  Create Project
                </Link>
              }
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {response.projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      padding: "1.5rem",
                      border: "1px solid #e0e0e0",
                      borderRadius: "0.5rem",
                      backgroundColor: "white",
                      transition: "box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {project.name}
                    </h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <StatusBadge status={project.status} />
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#757575" }}>
                      Updated: {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </AsyncState>
    </div>
  );
}
