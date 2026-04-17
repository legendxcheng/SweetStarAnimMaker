import type { TaskDetail } from "@sweet-star/shared";

import { CARD_CLASS, META_LABEL_CLASS, META_VALUE_CLASS, TASK_STATUS_LABELS } from "./constants";

interface CharacterSheetTaskStatusCardProps {
  task: TaskDetail;
}

export function CharacterSheetTaskStatusCard({ task }: CharacterSheetTaskStatusCardProps) {
  return (
    <div className={CARD_CLASS}>
      <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">任务状态</h4>
      <div className="grid gap-2">
        <div>
          <p className={META_LABEL_CLASS}>任务 ID</p>
          <p className={`${META_VALUE_CLASS} font-mono text-xs`}>{task.id}</p>
        </div>
        <div>
          <p className={META_LABEL_CLASS}>状态</p>
          <p className={META_VALUE_CLASS}>{TASK_STATUS_LABELS[task.status]}</p>
        </div>
        {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
      </div>
    </div>
  );
}
