import type {
  CharacterSheetBatchRecord,
  CharacterSheetRecordEntity,
} from "../domain/character-sheet";

export interface CharacterSheetRepository {
  insertBatch(batch: CharacterSheetBatchRecord): Promise<void> | void;
  findBatchById(
    batchId: string,
  ): Promise<CharacterSheetBatchRecord | null> | CharacterSheetBatchRecord | null;
  listCharactersByBatchId(
    batchId: string,
  ): Promise<CharacterSheetRecordEntity[]> | CharacterSheetRecordEntity[];
  insertCharacter(character: CharacterSheetRecordEntity): Promise<void> | void;
  findCharacterById(
    characterId: string,
  ): Promise<CharacterSheetRecordEntity | null> | CharacterSheetRecordEntity | null;
  updateCharacter(
    character: CharacterSheetRecordEntity,
  ): Promise<void> | void;
}
