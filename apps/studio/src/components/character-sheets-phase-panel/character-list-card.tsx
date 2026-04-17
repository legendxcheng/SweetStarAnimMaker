import type { CharacterSheetRecord } from "@sweet-star/shared";

import { CARD_CLASS, CHARACTER_STATUS_LABELS } from "./constants";

interface CharacterSheetListCardProps {
  characters: CharacterSheetRecord[];
  listLoading: boolean;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterSheetListCard({
  characters,
  listLoading,
  selectedCharacterId,
  onSelectCharacter,
}: CharacterSheetListCardProps) {
  return (
    <div className={CARD_CLASS}>
      <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">角色列表</h4>

      {listLoading ? (
        <p className="text-sm text-(--color-text-muted)">正在加载角色设定...</p>
      ) : (
        <div className="grid gap-2">
          {characters.map((character) => {
            const isSelected = character.id === selectedCharacterId;

            return (
              <button
                key={character.id}
                type="button"
                onClick={() => onSelectCharacter(character.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-(--color-accent)/40 bg-(--color-accent)/10"
                    : "border-(--color-border) bg-(--color-bg-base) hover:bg-(--color-bg-elevated)"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-(--color-text-primary)">
                    {character.characterName}
                  </span>
                  <span className="text-xs text-(--color-text-muted)">
                    {CHARACTER_STATUS_LABELS[character.status]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
