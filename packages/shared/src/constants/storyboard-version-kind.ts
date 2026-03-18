export const storyboardVersionKinds = ["ai", "human"] as const;

export type StoryboardVersionKind = (typeof storyboardVersionKinds)[number];
