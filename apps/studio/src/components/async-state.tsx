import { ReactNode } from "react";
import { ErrorState } from "./error-state";

interface AsyncStateProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  children: (data: T) => ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: (error: Error) => ReactNode;
}

export function AsyncState<T>({
  data,
  loading,
  error,
  children,
  loadingFallback = (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-(--color-text-muted)">Loading...</p>
    </div>
  ),
  errorFallback = (err) => <ErrorState error={err} />,
}: AsyncStateProps<T>) {
  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    return <>{errorFallback(error)}</>;
  }

  if (!data) {
    return null;
  }

  return <>{children(data)}</>;
}
