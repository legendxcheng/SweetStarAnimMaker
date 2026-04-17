import type { CharacterSheetRecord } from "@sweet-star/shared";

export function normalizeCharacter(character: CharacterSheetRecord) {
  return {
    ...character,
    referenceImages: character.referenceImages ?? [],
  };
}
