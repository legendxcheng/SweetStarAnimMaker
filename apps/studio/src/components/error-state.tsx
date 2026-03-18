interface ErrorStateProps {
  error: Error;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div
      style={{
        padding: "2rem",
        border: "1px solid #f44336",
        borderRadius: "0.5rem",
        backgroundColor: "#ffebee",
        color: "#c62828",
      }}
    >
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Error
      </h3>
      <p style={{ marginBottom: "1rem" }}>{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
