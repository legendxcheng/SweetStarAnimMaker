export const storyboardVersionKinds = ["ai"] as const;

export type StoryboardVersionKind = (typeof storyboardVersionKinds)[number];
