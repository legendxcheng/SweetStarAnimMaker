export const taskTypes = [
  "master_plot_generate",
  "character_sheets_generate",
  "character_sheet_generate",
  "storyboard_generate",
  "shot_script_generate",
  "shot_script_segment_generate",
] as const;

export type TaskType = (typeof taskTypes)[number];
