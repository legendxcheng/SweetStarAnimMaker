export type VideoPhaseActionBusy =
  | {
      kind:
        | "save-config"
        | "upload-audio"
        | "generate"
        | "regenerate-all-prompts"
        | "regenerate-all-videos"
        | "approve"
        | "approve-all";
      segmentId?: string;
    }
  | null;
