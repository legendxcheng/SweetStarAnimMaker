import { useEffect, useMemo, useState } from "react";
import type { CharacterSheetRecord } from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { config } from "../services/config";
import { ErrorState } from "./error-state";
import { CharacterSheetBatchSummaryCard } from "./character-sheets-phase-panel/batch-summary-card";
import { CharacterSheetDetailCard } from "./character-sheets-phase-panel/character-detail-card";
import { CharacterSheetImagePreviewModal } from "./character-sheets-phase-panel/image-preview-modal";
import { CharacterSheetListCard } from "./character-sheets-phase-panel/character-list-card";
import { CharacterSheetTaskStatusCard } from "./character-sheets-phase-panel/task-status-card";
import type {
  CharacterSheetsPhaseActionBusy,
  CharacterSheetsPhasePanelProps,
} from "./character-sheets-phase-panel/types";
import { normalizeCharacter } from "./character-sheets-phase-panel/utils";

export function CharacterSheetsPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
  onProjectRefresh,
}: CharacterSheetsPhasePanelProps) {
  const [characters, setCharacters] = useState<CharacterSheetRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSheetRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [actionError, setActionError] = useState<Error | null>(null);
  const [actionBusy, setActionBusy] = useState<CharacterSheetsPhaseActionBusy>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const batchSummary = project.currentCharacterSheetBatch;
  const selectedCharacterImageUrl = selectedCharacter
    ? config.characterSheetImageContentUrl(project.id, selectedCharacter.id)
    : null;
  const selectedListCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  useEffect(() => {
    if (!batchSummary) {
      setCharacters([]);
      setSelectedCharacterId(null);
      setSelectedCharacter(null);
      setPromptDraft("");
      setListError(null);
      return;
    }

    let cancelled = false;

    async function loadCharacters() {
      setListLoading(true);
      try {
        const response = await apiClient.listCharacterSheets(project.id);

        if (cancelled) {
          return;
        }

        setCharacters(response.characters.map(normalizeCharacter));
        setSelectedCharacterId((currentId) => {
          if (currentId && response.characters.some((character) => character.id === currentId)) {
            return currentId;
          }

          return response.characters[0]?.id ?? null;
        });
        setListError(null);
      } catch (error) {
        if (!cancelled) {
          setListError(error as Error);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    void loadCharacters();

    return () => {
      cancelled = true;
    };
  }, [batchSummary?.id, project.id]);

  useEffect(() => {
    const characterId = selectedCharacterId;

    if (!characterId) {
      setSelectedCharacter(null);
      setPromptDraft("");
      setDetailError(null);
      return;
    }

    let cancelled = false;

    async function loadCharacter(characterIdValue: string) {
      setDetailLoading(true);
      try {
        const response = await apiClient.getCharacterSheet(project.id, characterIdValue);

        if (cancelled) {
          return;
        }

        const normalizedCharacter = normalizeCharacter(response);
        setSelectedCharacter(normalizedCharacter);
        setPromptDraft(normalizedCharacter.promptTextCurrent);
        setDetailError(null);
      } catch (error) {
        if (!cancelled) {
          setDetailError(error as Error);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadCharacter(characterId);

    return () => {
      cancelled = true;
    };
  }, [project.id, selectedCharacterId]);

  useEffect(() => {
    if (!imagePreviewOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setImagePreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imagePreviewOpen]);

  useEffect(() => {
    if (!selectedCharacter?.imageAssetPath) {
      setImagePreviewOpen(false);
    }
  }, [selectedCharacter?.id, selectedCharacter?.imageAssetPath]);

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  function updateCharacterInList(nextCharacter: CharacterSheetRecord) {
    setCharacters((currentCharacters) =>
      currentCharacters.map((character) =>
        character.id === nextCharacter.id ? normalizeCharacter(nextCharacter) : character,
      ),
    );
  }

  function applyUpdatedCharacter(nextCharacter: CharacterSheetRecord) {
    const normalizedCharacter = normalizeCharacter(nextCharacter);

    setSelectedCharacter(normalizedCharacter);
    setPromptDraft(normalizedCharacter.promptTextCurrent);
    updateCharacterInList(normalizedCharacter);
  }

  async function handleSavePrompt() {
    if (!selectedCharacter) {
      return;
    }

    try {
      setActionBusy("save");
      const updatedCharacter = await apiClient.updateCharacterSheetPrompt(
        project.id,
        selectedCharacter.id,
        {
          promptTextCurrent: promptDraft,
        },
      );

      applyUpdatedCharacter(updatedCharacter);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegenerate() {
    if (!selectedCharacter) {
      return;
    }

    try {
      setActionBusy("regenerate");
      const nextTask = await apiClient.regenerateCharacterSheet(project.id, selectedCharacter.id);
      const nextCharacter = {
        ...selectedCharacter,
        status: "generating" as const,
        sourceTaskId: nextTask.id,
        updatedAt: nextTask.updatedAt,
      };

      setSelectedCharacter(nextCharacter);
      updateCharacterInList(nextCharacter);
      setActionError(null);
      await refreshProject();
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApprove() {
    if (!selectedCharacter) {
      return;
    }

    try {
      setActionBusy("approve");
      const approvedCharacter = await apiClient.approveCharacterSheet(project.id, selectedCharacter.id);

      setSelectedCharacter(approvedCharacter);
      updateCharacterInList(approvedCharacter);
      setActionError(null);
      await refreshProject();
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleReferenceImageUpload(files: FileList | null) {
    if (!selectedCharacter || !files || files.length === 0) {
      return;
    }

    try {
      setActionBusy("upload");
      const updatedCharacter = await apiClient.uploadCharacterReferenceImages(
        project.id,
        selectedCharacter.id,
        Array.from(files),
      );

      applyUpdatedCharacter(updatedCharacter);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDeleteReferenceImage(referenceImageId: string) {
    if (!selectedCharacter) {
      return;
    }

    try {
      setActionBusy("delete");
      const updatedCharacter = await apiClient.deleteCharacterReferenceImage(
        project.id,
        selectedCharacter.id,
        referenceImageId,
      );

      applyUpdatedCharacter(updatedCharacter);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <section aria-label="角色设定工作区">
      <CharacterSheetBatchSummaryCard
        project={project}
        creatingTask={creatingTask}
        disableGenerate={disableGenerate}
        onGenerate={onGenerate}
      />

      {task && <CharacterSheetTaskStatusCard task={task} />}

      {taskError && task && (
        <div className="mb-4">
          <ErrorState error={taskError} />
        </div>
      )}

      {project.status === "character_sheets_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">角色三视图生成中，正在自动刷新项目状态。</p>
        </div>
      )}

      {listError && (
        <div className="mb-4">
          <ErrorState error={listError} />
        </div>
      )}

      {batchSummary && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <CharacterSheetListCard
            characters={characters}
            listLoading={listLoading}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />

          <CharacterSheetDetailCard
            projectId={project.id}
            selectedCharacterTitle={
              selectedListCharacter ? `${selectedListCharacter.characterName} 角色详情` : "角色详情"
            }
            selectedCharacter={selectedCharacter}
            selectedCharacterImageUrl={selectedCharacterImageUrl}
            detailLoading={detailLoading}
            detailError={detailError}
            promptDraft={promptDraft}
            actionError={actionError}
            actionBusy={actionBusy}
            onPromptDraftChange={setPromptDraft}
            onOpenImagePreview={() => setImagePreviewOpen(true)}
            onUploadReferenceImages={handleReferenceImageUpload}
            onDeleteReferenceImage={handleDeleteReferenceImage}
            onSavePrompt={handleSavePrompt}
            onRegenerate={handleRegenerate}
            onApprove={handleApprove}
          />
        </div>
      )}

      <CharacterSheetImagePreviewModal
        selectedCharacter={selectedCharacter}
        selectedCharacterImageUrl={selectedCharacterImageUrl}
        open={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
      />
    </section>
  );
}
