export const storyboardReviewActions = ["approve", "reject"] as const;

export type StoryboardReviewAction = (typeof storyboardReviewActions)[number];
