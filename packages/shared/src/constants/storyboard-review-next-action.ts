export const storyboardReviewNextActions = ["regenerate", "edit_manually"] as const;

export type StoryboardReviewNextAction =
  (typeof storyboardReviewNextActions)[number];
