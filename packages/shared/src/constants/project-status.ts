export const projectStatuses = ["script_ready"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const initialProjectStatus: ProjectStatus = "script_ready";
