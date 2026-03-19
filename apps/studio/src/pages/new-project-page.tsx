import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api-client";
import { PageHeader } from "../components/page-header";
import { ErrorState } from "../components/error-state";

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
      <PageHeader title="Create New Project" />

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
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
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
            Premise
          </label>
          <textarea
            id="project-premise"
            value={premiseText}
            onChange={(e) => setPremiseText(e.target.value)}
            placeholder="Describe the premise for master-plot generation"
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
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/projects")}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-(--color-bg-elevated) text-(--color-text-primary) border border-(--color-border-muted) hover:border-(--color-text-muted) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
