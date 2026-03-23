export class CurrentCharacterSheetBatchNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current character sheet batch not found for project: ${projectId}`);
    this.name = "CurrentCharacterSheetBatchNotFoundError";
  }
}

export class CharacterSheetNotFoundError extends Error {
  constructor(characterId: string) {
    super(`Character sheet not found: ${characterId}`);
    this.name = "CharacterSheetNotFoundError";
  }
}

export class CharacterReferenceImageNotFoundError extends Error {
  constructor(referenceImageId: string) {
    super(`Character reference image not found: ${referenceImageId}`);
    this.name = "CharacterReferenceImageNotFoundError";
  }
}

export class CharacterSheetImageNotFoundError extends Error {
  constructor(characterId: string) {
    super(`Character sheet image not found: ${characterId}`);
    this.name = "CharacterSheetImageNotFoundError";
  }
}
