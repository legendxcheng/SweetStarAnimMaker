export const taskTypes = [
  "master_plot_generate",
  "character_sheets_generate",
  "character_sheet_generate",
  "storyboard_generate",
] as const;

export type TaskType = (typeof taskTypes)[number];
