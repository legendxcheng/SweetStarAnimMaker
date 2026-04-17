export type VideoPhaseActionBusy =
  | {
      kind:
        | "save-prompt"
        | "regenerate-prompt"
        | "regenerate-all-prompts"
        | "regenerate"
        | "regenerate-all-videos"
        | "approve"
        | "approve-all";
      shotId?: string;
    }
  | null;
