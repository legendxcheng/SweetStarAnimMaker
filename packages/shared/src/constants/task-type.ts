export const taskTypes = ["master_plot_generate", "storyboard_generate"] as const;

export type TaskType = (typeof taskTypes)[number];
