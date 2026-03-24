import { getButtonClassName } from "../styles/button-styles";

interface ErrorStateProps {
  error: Error;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10">
      <h3 className="text-sm font-semibold text-(--color-danger) mb-1">错误</h3>
      <p className="text-sm text-(--color-danger)/80 mb-3">{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          className={`${getButtonClassName({
            variant: "danger",
            size: "compact",
          })} text-xs`}
        >
          重试
        </button>
      )}
    </div>
  );
}
