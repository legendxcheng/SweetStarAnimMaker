export const projectStatuses = [
  "premise_ready",
  "master_plot_generating",
  "master_plot_in_review",
  "master_plot_approved",
  "character_sheets_generating",
  "character_sheets_in_review",
  "character_sheets_approved",
  "storyboard_generating",
  "storyboard_in_review",
  "storyboard_approved",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const initialProjectStatus: ProjectStatus = "premise_ready";
