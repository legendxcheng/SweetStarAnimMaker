export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:13000",
  characterSheetImageContentUrl(projectId: string, characterId: string) {
    return `${this.apiBaseUrl}/projects/${projectId}/character-sheets/${characterId}/content`;
  },
  characterReferenceImageContentUrl(
    projectId: string,
    characterId: string,
    referenceImageId: string,
  ) {
    return `${this.apiBaseUrl}/projects/${projectId}/character-sheets/${characterId}/reference-images/${referenceImageId}/content`;
  },
  imageFrameContentUrl(projectId: string, frameId: string) {
    return `${this.apiBaseUrl}/projects/${projectId}/images/frames/${frameId}/content`;
  },
  projectAssetContentUrl(projectId: string, assetRelPath: string) {
    return `${this.apiBaseUrl}/projects/${projectId}/assets/${assetRelPath}`;
  },
};
