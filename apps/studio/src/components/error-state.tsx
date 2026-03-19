interface ErrorStateProps {
  error: Error;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10">
      <h3 className="text-sm font-semibold text-(--color-danger) mb-1">Error</h3>
      <p className="text-sm text-(--color-danger)/80 mb-3">{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-(--color-danger)/10 text-(--color-danger) border border-(--color-danger)/30 hover:bg-(--color-danger)/20 transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}
