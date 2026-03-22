export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:13000",
  characterReferenceImageContentUrl(
    projectId: string,
    characterId: string,
    referenceImageId: string,
  ) {
    return `${this.apiBaseUrl}/projects/${projectId}/character-sheets/${characterId}/reference-images/${referenceImageId}/content`;
  },
};
