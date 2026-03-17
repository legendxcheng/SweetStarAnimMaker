export const taskStatuses = ["pending", "running", "succeeded", "failed"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
