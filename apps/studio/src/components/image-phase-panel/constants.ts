import type { ShotReferenceFrame, TaskDetail } from "@sweet-star/shared";

export const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

export const FRAME_STATUS_LABELS: Record<ShotReferenceFrame["imageStatus"], string> = {
  pending: "待处理",
  generating: "生成中",
  in_review: "待审核",
  approved: "已通过",
  failed: "失败",
};

export const FRAME_PLAN_STATUS_LABELS: Record<ShotReferenceFrame["planStatus"], string> = {
  pending: "Prompt 生成中",
  planned: "Prompt 已就绪",
  plan_failed: "Prompt 生成失败",
};
