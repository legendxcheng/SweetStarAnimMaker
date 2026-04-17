import type { TaskDetail } from "@sweet-star/shared";

import { TASK_STATUS_LABELS } from "./constants";

interface TaskStatusCardProps {
  cardClass: string;
  metaLabelClass: string;
  metaValueClass: string;
  task: TaskDetail;
}

export function TaskStatusCard({
  cardClass,
  metaLabelClass,
  metaValueClass,
  task,
}: TaskStatusCardProps) {
  return (
    <div className={cardClass}>
      <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">任务状态</h4>
      <div className="grid gap-2">
        <div>
          <p className={metaLabelClass}>任务 ID</p>
          <p className={`${metaValueClass} font-mono text-xs`}>{task.id}</p>
        </div>
        <div>
          <p className={metaLabelClass}>状态</p>
          <p className={metaValueClass}>{TASK_STATUS_LABELS[task.status]}</p>
        </div>
        {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
      </div>
    </div>
  );
}
