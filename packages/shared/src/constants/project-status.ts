export const projectStatuses = [
  "script_ready",
  "storyboard_generating",
  "storyboard_in_review",
  "storyboard_approved",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const initialProjectStatus: ProjectStatus = "script_ready";
