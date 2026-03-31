export const taskTypes = [
  "master_plot_generate",
  "character_sheets_generate",
  "character_sheet_generate",
  "storyboard_generate",
  "shot_script_generate",
  "shot_script_segment_generate",
  "images_generate",
  "image_batch_generate_all_frames",
  "image_batch_regenerate_failed_frames",
  "image_batch_regenerate_all_prompts",
  "image_batch_regenerate_failed_prompts",
  "frame_prompt_generate",
  "frame_image_generate",
  "videos_generate",
  "segment_video_prompt_generate",
  "segment_video_generate",
  "final_cut_generate",
] as const;

export type TaskType = (typeof taskTypes)[number];
