import { useEffect, useState } from "react";
import type { ProjectDetail, SceneSheetRecord, TaskDetail } from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { config } from "../services/config";
import { getButtonClassName } from "../styles/button-styles";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface SceneSheetsPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => Promise<void>;
}

export function SceneSheetsPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
  onProjectRefresh,
}: SceneSheetsPhasePanelProps) {
  const [scenes, setScenes] = useState<SceneSheetRecord[]>([]);
  const [listError, setListError] = useState<Error | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [actionBusyBySceneId, setActionBusyBySceneId] = useState<Record<string, string | null>>({});
  const [brokenImageBySceneId, setBrokenImageBySceneId] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<Error | null>(null);
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batch = project.currentSceneSheetBatch;

  useEffect(() => {
    if (!batch) {
      setScenes([]);
      setListError(null);
      return;
    }

    let cancelled = false;

    async function loadScenes() {
      try {
        const response = await apiClient.listSceneSheets(project.id);

        if (!cancelled) {
          setScenes(response.scenes);
          setPromptDrafts(
            Object.fromEntries(
              response.scenes.map((scene) => [scene.id, scene.promptTextCurrent]),
            ),
          );
          setBrokenImageBySceneId({});
          setListError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setListError(error as Error);
        }
      }
    }

    void loadScenes();

    return () => {
      cancelled = true;
    };
  }, [batch?.id, project.id]);

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  function applyUpdatedScene(nextScene: SceneSheetRecord) {
    setScenes((currentScenes) =>
      currentScenes.map((scene) => (scene.id === nextScene.id ? nextScene : scene)),
    );
    setPromptDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextScene.id]: nextScene.promptTextCurrent,
    }));
  }

  async function persistPrompt(scene: SceneSheetRecord) {
    const nextPromptText = (promptDrafts[scene.id] ?? scene.promptTextCurrent).trim();

    if (nextPromptText === scene.promptTextCurrent) {
      return scene;
    }

    const updatedScene = await apiClient.updateSceneSheetPrompt(project.id, scene.id, {
      promptTextCurrent: nextPromptText,
    });
    applyUpdatedScene(updatedScene);

    return updatedScene;
  }

  async function handleSavePrompt(scene: SceneSheetRecord) {
    try {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: "save" }));
      await persistPrompt(scene);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: null }));
    }
  }

  async function handleRegenerate(scene: SceneSheetRecord) {
    try {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: "regenerate" }));
      const preparedScene = await persistPrompt(scene);
      const nextTask = await apiClient.regenerateSceneSheet(project.id, scene.id);
      applyUpdatedScene({
        ...preparedScene,
        status: "generating",
        approvedAt: null,
        updatedAt: nextTask.updatedAt,
        sourceTaskId: nextTask.id,
      });
      setActionError(null);
      await refreshProject();
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: null }));
    }
  }

  async function handleApprove(scene: SceneSheetRecord) {
    try {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: "approve" }));
      const approvedScene = await apiClient.approveSceneSheet(project.id, scene.id);
      applyUpdatedScene(approvedScene);
      setActionError(null);
      await refreshProject();
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusyBySceneId((current) => ({ ...current, [scene.id]: null }));
    }
  }

  return (
    <section aria-label="场景设定工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">场景设定工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              在正式生成分镜前，先沉淀项目级场景锚点，用来稳定环境空间、陈设与整体氛围。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className={getButtonClassName()}
          >
            {creatingTask ? "启动中..." : "生成场景设定"}
          </button>
        </div>

        {batch ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <p className={metaLabelClass}>场景数量</p>
              <p className={metaValueClass}>{batch.sceneCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过</p>
              <p className={metaValueClass}>
                {batch.approvedSceneCount}/{batch.sceneCount}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>来源主情节</p>
              <p className={`${metaValueClass} font-mono text-xs`}>{batch.sourceMasterPlotId}</p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(batch.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--color-text-muted)">
            当前还没有场景设定批次。生成后会在这里展示可复用的项目级场景锚点。
          </p>
        )}
      </div>

      {listError && (
        <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 mb-4">
          <p className="text-sm text-(--color-danger)/80">{listError.message}</p>
        </div>
      )}

      {scenes.length > 0 && (
        <div className="grid gap-4">
          {scenes.map((scene) => (
            <article key={scene.id} className={cardClass}>
              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
                <div className="rounded-lg overflow-hidden border border-(--color-border)">
                  {scene.imageAssetPath ? (
                    brokenImageBySceneId[scene.id] ? (
                      <div className="aspect-video bg-(--color-bg-elevated) flex items-center justify-center text-sm text-(--color-text-muted)">
                        暂无场景图
                      </div>
                    ) : (
                      <img
                        src={config.projectAssetContentUrl(project.id, scene.imageAssetPath)}
                        alt={scene.sceneName}
                        className="w-full h-auto block"
                        onError={() => {
                          setBrokenImageBySceneId((current) => ({
                            ...current,
                            [scene.id]: true,
                          }));
                        }}
                      />
                    )
                  ) : (
                    <div className="aspect-video bg-(--color-bg-elevated) flex items-center justify-center text-sm text-(--color-text-muted)">
                      {scene.status === "generating" ? "场景图生成中" : "暂无场景图"}
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-(--color-text-primary)">
                      {scene.sceneName}
                    </h4>
                    <p className="text-sm text-(--color-text-muted) mt-1">{scene.scenePurpose}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>状态</p>
                    <p className={metaValueClass}>
                      {scene.status === "generating"
                        ? "生成中"
                        : scene.status === "approved"
                          ? "已通过"
                          : scene.status === "failed"
                            ? "失败"
                            : "待审核"}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>约束</p>
                    <p className={metaValueClass}>{scene.constraintsText}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>当前提示词</p>
                    <textarea
                      aria-label="场景提示词"
                      value={promptDrafts[scene.id] ?? scene.promptTextCurrent}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setPromptDrafts((current) => ({
                          ...current,
                          [scene.id]: nextValue,
                        }));
                      }}
                      className="w-full min-h-32 rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-text-primary)"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSavePrompt(scene);
                      }}
                      disabled={actionBusyBySceneId[scene.id] != null}
                      className={getButtonClassName({ variant: "secondary" })}
                    >
                      保存提示词
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRegenerate(scene);
                      }}
                      disabled={actionBusyBySceneId[scene.id] != null}
                      className={getButtonClassName()}
                    >
                      重新生成当前场景
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleApprove(scene);
                      }}
                      disabled={actionBusyBySceneId[scene.id] != null || scene.status === "approved"}
                      className={getButtonClassName({ variant: "secondary" })}
                    >
                      通过当前场景
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 mt-4">
          <p className="text-sm text-(--color-danger)/80">{actionError.message}</p>
        </div>
      )}

      {project.status === "scene_sheets_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">场景设定生成中，正在自动刷新项目状态。</p>
        </div>
      )}

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
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(task.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
            {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
          </div>
        </div>
      )}

      {taskError && task && (
        <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10">
          <h4 className="text-sm font-semibold text-(--color-danger) mb-1">错误</h4>
          <p className="text-sm text-(--color-danger)/80">{taskError.message}</p>
        </div>
      )}
    </section>
  );
}
