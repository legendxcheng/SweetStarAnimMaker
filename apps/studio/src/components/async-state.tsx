import { ReactNode } from "react";

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
  loadingFallback = <div>Loading...</div>,
  errorFallback = (err) => <div>Error: {err.message}</div>,
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
