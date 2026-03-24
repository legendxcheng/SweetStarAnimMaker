import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api-client";
import { PageHeader } from "../components/page-header";
import { ErrorState } from "../components/error-state";
import { getButtonClassName } from "../styles/button-styles";

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [premiseText, setPremiseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !premiseText.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.createProject({
        name: name.trim(),
        premiseText: premiseText.trim(),
      });
      navigate(`/projects/${response.id}`);
    } catch (err) {
      setError(err as Error);
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-(--color-bg-surface) border border-(--color-border-muted) text-(--color-text-primary) placeholder:text-(--color-text-muted) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20 disabled:opacity-40";

  return (
    <div>
      <PageHeader title="新建项目" />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} retry={() => setError(null)} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-6"
      >
        <div className="mb-5">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            项目名称
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入项目名称"
            required
            disabled={submitting}
            className={inputClass}
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="project-premise"
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            项目前提
          </label>
          <textarea
            id="project-premise"
            value={premiseText}
            onChange={(e) => setPremiseText(e.target.value)}
            placeholder="请描述用于生成主情节的项目前提"
            required
            disabled={submitting}
            rows={10}
            className={`${inputClass} resize-y font-[inherit]`}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !premiseText.trim()}
            className={getButtonClassName()}
          >
            {submitting ? "创建中..." : "创建项目"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/projects")}
            disabled={submitting}
            className={getButtonClassName({ variant: "secondary" })}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
