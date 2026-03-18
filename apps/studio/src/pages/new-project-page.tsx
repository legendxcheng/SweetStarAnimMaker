import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api-client";
import { PageHeader } from "../components/page-header";
import { ErrorState } from "../components/error-state";

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.post<{ project: { id: string } }>(
        "/projects",
        { name: name.trim() }
      );
      navigate(`/projects/${response.project.id}`);
    } catch (err) {
      setError(err as Error);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Create New Project" />

      {error && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorState error={error} retry={() => setError(null)} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "600px",
          padding: "2rem",
          border: "1px solid #e0e0e0",
          borderRadius: "0.5rem",
          backgroundColor: "white",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="project-name"
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
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
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e0e0e0",
              borderRadius: "0.25rem",
              fontSize: "1rem",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: submitting ? "#ccc" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              fontSize: "1rem",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/projects")}
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "white",
              color: "#333",
              border: "1px solid #e0e0e0",
              borderRadius: "0.25rem",
              fontSize: "1rem",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
