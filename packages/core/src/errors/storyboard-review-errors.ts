export class StoryboardReviewVersionConflictError extends Error {
  constructor(versionId: string) {
    super(`Storyboard review action requires current version: ${versionId}`);
    this.name = "StoryboardReviewVersionConflictError";
  }
}

export class RejectStoryboardReasonRequiredError extends Error {
  constructor() {
    super("Reject reason is required");
    this.name = "RejectStoryboardReasonRequiredError";
  }
}
