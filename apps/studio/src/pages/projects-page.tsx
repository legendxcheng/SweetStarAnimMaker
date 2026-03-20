import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ProjectSummary } from "@sweet-star/shared";
import { apiClient } from "../services/api-client";
import { AsyncState } from "../components/async-state";
import { PageHeader } from "../components/page-header";
import { StatusBadge } from "../components/status-badge";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";

export function ProjectsPage() {
  const [data, setData] = useState<ProjectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listProjects();
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
      <PageHeader title="项目列表" />

      <AsyncState
        data={data}
        loading={loading}
        error={error}
        errorFallback={(err) => <ErrorState error={err} retry={loadProjects} />}
      >
        {(projects) =>
          projects.length === 0 ? (
            <EmptyState
              message="还没有项目。先创建一个项目开始使用。"
              action={
                <Link
                  to="/projects/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity"
                >
                  创建项目
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block no-underline"
                >
                  <div className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 hover:border-(--color-border-muted) transition-colors cursor-pointer">
                    <h3 className="text-base font-semibold text-(--color-text-primary) mb-2">
                      {project.name}
                    </h3>
                    <div className="mb-3">
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-(--color-text-muted)">
                      更新于：{new Date(project.updatedAt).toLocaleDateString("zh-CN")}
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
