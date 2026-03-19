export const taskTypes = ["master_plot_generate"] as const;

export type TaskType = (typeof taskTypes)[number];
