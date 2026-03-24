import { useEffect, useMemo, useState } from "react";
import type { CharacterSheetRecord, ProjectDetail, TaskDetail } from "@sweet-star/shared";

import { ErrorState } from "./error-state";
import { apiClient } from "../services/api-client";
import { config } from "../services/config";
import { getButtonClassName } from "../styles/button-styles";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

const CHARACTER_STATUS_LABELS: Record<CharacterSheetRecord["status"], string> = {
  generating: "生成中",
  in_review: "待审核",
  approved: "已通过",
  failed: "失败",
};

interface CharacterSheetsPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => void | Promise<void>;
}

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
  const [actionBusy, setActionBusy] = useState<
    "save" | "upload" | "delete" | "regenerate" | "approve" | null
  >(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batchSummary = project.currentCharacterSheetBatch;
  const selectedReferenceImages = selectedCharacter?.referenceImages ?? [];
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

      setSelectedCharacter({
        ...selectedCharacter,
        status: "generating",
        sourceTaskId: nextTask.id,
        updatedAt: nextTask.updatedAt,
      });
      updateCharacterInList({
        ...selectedCharacter,
        status: "generating",
        sourceTaskId: nextTask.id,
        updatedAt: nextTask.updatedAt,
      });
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
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">角色设定工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              生成每个主角的角色三视图，编辑提示词，并逐个审核通过后再进入分镜。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className={getButtonClassName()}
          >
            {creatingTask ? "启动中..." : "重新生成"}
          </button>
        </div>

        {batchSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={metaLabelClass}>角色数量</p>
              <p className={metaValueClass}>{batchSummary.characterCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过</p>
              <p className={metaValueClass}>
                {batchSummary.approvedCharacterCount}/{batchSummary.characterCount}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(batchSummary.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--color-text-muted)">
            主情节通过后，可以从这里启动角色三视图生成。
          </p>
        )}
      </div>

      {task && (
        <div className={cardClass}>
          <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">任务状态</h4>
          <div className="grid gap-2">
            <div>
              <p className={metaLabelClass}>任务 ID</p>
              <p className={`${metaValueClass} font-mono text-xs`}>{task.id}</p>
            </div>
            <div>
              <p className={metaLabelClass}>状态</p>
              <p className={metaValueClass}>{TASK_STATUS_LABELS[task.status]}</p>
            </div>
            {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
          </div>
        </div>
      )}

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
          <div className={cardClass}>
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
                      onClick={() => setSelectedCharacterId(character.id)}
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

          <div className={cardClass}>
            <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">
              {selectedListCharacter ? `${selectedListCharacter.characterName} 角色详情` : "角色详情"}
            </h4>

            {detailError && <ErrorState error={detailError} />}

            {detailLoading && (
              <p className="text-sm text-(--color-text-muted)">正在加载角色详情...</p>
            )}

            {!detailLoading && !detailError && !selectedCharacter && (
              <p className="text-sm text-(--color-text-muted)">选择一个角色以查看和编辑当前设定。</p>
            )}

            {selectedCharacter && !detailLoading && !detailError && (
              <div className="grid gap-4">
                <div className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className={metaLabelClass}>当前立绘预览</p>
                      <p className="text-sm text-(--color-text-muted)">
                        点击缩略图或按钮查看大图。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImagePreviewOpen(true)}
                      disabled={!selectedCharacter.imageAssetPath}
                      className={getButtonClassName({
                        variant: "secondary",
                        size: "compact",
                      })}
                    >
                      查看大图
                    </button>
                  </div>

                  {selectedCharacter.imageAssetPath && selectedCharacterImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setImagePreviewOpen(true)}
                      className="block w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-surface)"
                    >
                      <img
                        src={selectedCharacterImageUrl}
                        alt={`${selectedCharacter.characterName} 当前立绘`}
                        className="h-72 w-full object-contain bg-(--color-bg-elevated)"
                      />
                    </button>
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-surface) text-sm text-(--color-text-muted)">
                      尚未生成当前立绘
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className={metaLabelClass}>当前状态</p>
                    <p className={metaValueClass}>
                      {CHARACTER_STATUS_LABELS[selectedCharacter.status]}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>图像资源</p>
                    <p className={`${metaValueClass} break-all`}>
                      {selectedCharacter.imageAssetPath ?? "尚未生成"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className={metaLabelClass}>当前提示词</p>
                  <textarea
                    value={promptDraft}
                    onChange={(event) => setPromptDraft(event.target.value)}
                    className="w-full min-h-40 rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-3 text-sm text-(--color-text-primary)"
                  />
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className={metaLabelClass}>参考图</p>
                    <div>
                      <label
                        className={`inline-flex cursor-pointer items-center ${getButtonClassName({
                          variant: "secondary",
                          size: "compact",
                        })}`}
                      >
                        添加参考图
                        <input
                          aria-label="添加参考图"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            void handleReferenceImageUpload(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {selectedReferenceImages.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedReferenceImages.map((referenceImage) => (
                        <div
                          key={referenceImage.id}
                          className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-3"
                        >
                          <img
                            src={config.characterReferenceImageContentUrl(
                              project.id,
                              selectedCharacter.id,
                              referenceImage.id,
                            )}
                            alt={referenceImage.originalFileName}
                            className="mb-3 h-32 w-full rounded-lg object-cover"
                          />
                          <p className="mb-2 truncate text-sm text-(--color-text-primary)">
                            {referenceImage.originalFileName}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteReferenceImage(referenceImage.id);
                            }}
                            disabled={actionBusy !== null}
                            aria-label={`删除参考图 ${referenceImage.originalFileName}`}
                            className={getButtonClassName({
                              variant: "danger",
                              size: "compact",
                            })}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-(--color-text-muted)">
                      暂无参考图。添加后会在重新生成时自动带入。
                    </p>
                  )}
                </div>

                {actionError && <ErrorState error={actionError} />}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSavePrompt();
                    }}
                    disabled={actionBusy !== null}
                    className={getButtonClassName({ variant: "secondary" })}
                  >
                    保存提示词
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRegenerate();
                    }}
                    disabled={actionBusy !== null}
                    className={getButtonClassName({ variant: "warning" })}
                  >
                    重新生成
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleApprove();
                    }}
                    disabled={actionBusy !== null}
                    className={getButtonClassName({ variant: "success" })}
                  >
                    通过当前角色
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCharacter && selectedCharacterImageUrl && imagePreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedCharacter.characterName} 当前立绘预览`}
            className="relative max-h-full w-full max-w-6xl rounded-2xl border border-white/10 bg-(--color-bg-surface) p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-(--color-text-primary)">
                  {selectedCharacter.characterName} 当前立绘预览
                </p>
                <p className="text-sm text-(--color-text-muted)">
                  {selectedCharacter.imageWidth && selectedCharacter.imageHeight
                    ? `${selectedCharacter.imageWidth} × ${selectedCharacter.imageHeight}`
                    : "原始尺寸"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImagePreviewOpen(false)}
                className={getButtonClassName({
                  variant: "secondary",
                  size: "compact",
                })}
              >
                关闭大图预览
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto rounded-xl bg-black/20">
              <img
                src={selectedCharacterImageUrl}
                alt={`${selectedCharacter.characterName} 当前立绘大图`}
                className="mx-auto block h-auto max-w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function normalizeCharacter(character: CharacterSheetRecord) {
  return {
    ...character,
    referenceImages: character.referenceImages ?? [],
  };
}
