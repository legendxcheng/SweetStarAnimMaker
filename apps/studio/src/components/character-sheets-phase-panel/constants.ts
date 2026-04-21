import type { CharacterSheetRecord, TaskDetail } from "@sweet-star/shared";

export const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

export const CHARACTER_STATUS_LABELS: Record<CharacterSheetRecord["status"], string> = {
  generating: "生成中",
  in_review: "待审核",
  approved: "已通过",
  failed: "失败",
};

export const CHARACTER_STATUS_TAG_CLASSNAMES: Record<CharacterSheetRecord["status"], string> = {
  generating:
    "bg-(--color-accent)/15 text-(--color-accent) border border-(--color-accent)/25",
  in_review:
    "bg-(--color-warning)/15 text-(--color-warning) border border-(--color-warning)/25",
  approved:
    "bg-(--color-success)/15 text-(--color-success) border border-(--color-success)/25",
  failed: "bg-(--color-danger)/15 text-(--color-danger) border border-(--color-danger)/25",
};

export const CARD_CLASS =
  "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";

export const META_LABEL_CLASS = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";

export const META_VALUE_CLASS = "text-sm text-(--color-text-primary)";
