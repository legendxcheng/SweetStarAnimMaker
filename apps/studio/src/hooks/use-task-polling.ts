import { useEffect, useRef, useState } from "react";
import type { TaskDetail } from "@sweet-star/shared";
import { apiClient } from "../services/api-client";

interface UseTaskPollingOptions {
  taskId: string | null;
  enabled?: boolean;
  intervalMs?: number;
  onTaskUpdate?: (task: TaskDetail) => void;
  onTerminal?: (task: TaskDetail) => void | Promise<void>;
}

function isTerminalStatus(status: TaskDetail["status"]) {
  return status === "succeeded" || status === "failed";
}

export function useTaskPolling({
  taskId,
  enabled = true,
  intervalMs = 3000,
  onTaskUpdate,
  onTerminal,
}: UseTaskPollingOptions) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const onTaskUpdateRef = useRef(onTaskUpdate);
  const onTerminalRef = useRef(onTerminal);

  useEffect(() => {
    onTaskUpdateRef.current = onTaskUpdate;
    onTerminalRef.current = onTerminal;
  }, [onTaskUpdate, onTerminal]);

  useEffect(() => {
    if (!taskId || !enabled) {
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const nextTask = await apiClient.getTaskDetail(taskId);

        if (cancelled) {
          return;
        }

        setTask(nextTask);
        setError(null);
        onTaskUpdateRef.current?.(nextTask);

        if (isTerminalStatus(nextTask.status)) {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          await onTerminalRef.current?.(nextTask);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      }
    };

    interval = setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [taskId, enabled, intervalMs]);

  return {
    task,
    error,
  };
}
