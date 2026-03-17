export const taskTypes = ["storyboard_generate"] as const;

export type TaskType = (typeof taskTypes)[number];
