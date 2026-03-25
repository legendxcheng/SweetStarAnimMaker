export const taskTypes = [
  "master_plot_generate",
  "character_sheets_generate",
  "character_sheet_generate",
  "storyboard_generate",
  "shot_script_generate",
  "shot_script_segment_generate",
  "images_generate",
  "frame_prompt_generate",
  "frame_image_generate",
  "videos_generate",
  "segment_video_generate",
] as const;

export type TaskType = (typeof taskTypes)[number];
