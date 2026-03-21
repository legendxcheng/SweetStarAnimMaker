export class CurrentMasterPlotNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current master plot not found for project: ${projectId}`);
    this.name = "CurrentMasterPlotNotFoundError";
  }
}

export class CurrentStoryboardNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current storyboard not found for project: ${projectId}`);
    this.name = "CurrentStoryboardNotFoundError";
  }
}
