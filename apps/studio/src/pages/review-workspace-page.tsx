import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  CurrentStoryboard,
  SaveStoryboardRequest,
  StoryboardReviewWorkspace,
} from "@sweet-star/shared";

import { AsyncState } from "../components/async-state";
import { StatusBadge } from "../components/status-badge";
import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";

function toEditableStoryboard(storyboard: CurrentStoryboard): SaveStoryboardRequest {
  return {
    title: storyboard.title,
    episodeTitle: storyboard.episodeTitle,
    sourceMasterPlotId: storyboard.sourceMasterPlotId,
    sourceTaskId: storyboard.sourceTaskId,
    scenes: storyboard.scenes,
  };
}

export function ReviewWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<StoryboardReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState<SaveStoryboardRequest | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadWorkspace = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await apiClient.getStoryboardReviewWorkspace(projectId);
      setWorkspace(data);
      setDraft(toEditableStoryboard(data.currentStoryboard));
      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [projectId]);

  const updateDraft = <K extends keyof SaveStoryboardRequest>(
    field: K,
    value: SaveStoryboardRequest[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };

  const updateScene = (
    sceneIndex: number,
    field: "name" | "dramaticPurpose",
    value: string,
  ) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        scenes: prev.scenes.map((scene, index) =>
          index === sceneIndex ? { ...scene, [field]: value } : scene,
        ),
      };
    });
    setHasChanges(true);
  };

  const updateSegment = (
    sceneIndex: number,
    segmentIndex: number,
    field:
      | "durationSec"
      | "visual"
      | "characterAction"
      | "dialogue"
      | "voiceOver"
      | "audio"
      | "purpose",
    value: number | string | null,
  ) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        scenes: prev.scenes.map((scene, currentSceneIndex) => {
          if (currentSceneIndex !== sceneIndex) {
            return scene;
          }

          return {
            ...scene,
            segments: scene.segments.map((segment, currentSegmentIndex) =>
              currentSegmentIndex === segmentIndex
                ? { ...segment, [field]: value }
                : segment,
            ),
          };
        }),
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!projectId || !draft) return;
    try {
      setSaving(true);
      await apiClient.saveStoryboard(projectId, draft);
      await loadWorkspace();
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!projectId) return;
    if (!confirm("确认要通过这个分镜吗？")) return;
    try {
      setSubmittingAction(true);
      await apiClient.approveStoryboard(projectId, {});
      alert("分镜已通过！");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`通过失败：${(err as Error).message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!projectId) return;
    if (!confirm("确认要驳回当前分镜并重新生成吗？")) return;
    try {
      setSubmittingAction(true);
      await apiClient.rejectStoryboard(projectId, {});
      alert("分镜已驳回，已创建重新生成任务。");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      alert(`驳回失败：${(err as Error).message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const inputClass =
    "w-full bg-(--color-bg-base) border border-(--color-border-muted) text-(--color-text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20";

  return (
    <div className="flex flex-col h-full -m-6">
      <AsyncState loading={loading} error={error} data={workspace}>
        {(ws) => {
          const currentDraft = draft ?? toEditableStoryboard(ws.currentStoryboard);

          return (
            <>
              <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-3 bg-(--color-bg-base) shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="text-sm text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
                  >
                    ← 返回
                  </button>
                  <span className="text-(--color-border-muted)">|</span>
                  <span className="text-sm font-semibold text-(--color-text-primary)">
                    分镜审核
                  </span>
                  <StatusBadge status={ws.projectStatus} />
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && ws.availableActions.save && (
                    <button
                      onClick={() => {
                        void handleSave();
                      }}
                      disabled={saving}
                      className={getButtonClassName({ size: "compact" })}
                    >
                      {saving ? "保存中..." : "保存修改"}
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.approve && (
                    <button
                      onClick={() => {
                        void handleApprove();
                      }}
                      disabled={submittingAction}
                      className={getButtonClassName({
                        variant: "success",
                        size: "compact",
                      })}
                    >
                      通过
                    </button>
                  )}
                  {!hasChanges && ws.availableActions.reject && (
                    <button
                      onClick={() => {
                        void handleReject();
                      }}
                      disabled={submittingAction}
                      className={getButtonClassName({
                        variant: "danger",
                        size: "compact",
                      })}
                    >
                      驳回
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="title-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    标题
                  </label>
                  <input
                    id="title-input"
                    value={currentDraft.title ?? ""}
                    onChange={(event) => updateDraft("title", event.target.value || null)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="episode-title-input"
                    className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                  >
                    集标题
                  </label>
                  <input
                    id="episode-title-input"
                    value={currentDraft.episodeTitle ?? ""}
                    onChange={(event) =>
                      updateDraft("episodeTitle", event.target.value || null)
                    }
                    className={inputClass}
                  />
                </div>

                {currentDraft.scenes.map((scene, sceneIndex) => (
                  <section
                    key={scene.id}
                    className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-4"
                  >
                    <h3 className="text-sm font-semibold text-(--color-text-primary) mb-4">
                      场景 {scene.order}
                    </h3>
                    <div className="grid gap-4">
                      <div>
                        <label
                          htmlFor={`scene-${sceneIndex}-name`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          场景 {scene.order} 名称
                        </label>
                        <input
                          id={`scene-${sceneIndex}-name`}
                          value={scene.name}
                          onChange={(event) =>
                            updateScene(sceneIndex, "name", event.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`scene-${sceneIndex}-purpose`}
                          className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                        >
                          场景 {scene.order} 戏剧目的
                        </label>
                        <textarea
                          id={`scene-${sceneIndex}-purpose`}
                          aria-label={`场景 ${scene.order} 戏剧目的`}
                          value={scene.dramaticPurpose}
                          onChange={(event) =>
                            updateScene(sceneIndex, "dramaticPurpose", event.target.value)
                          }
                          rows={3}
                          className={`${inputClass} resize-y`}
                        />
                      </div>

                      {scene.segments.map((segment, segmentIndex) => (
                        <div
                          key={segment.id}
                          className="rounded-lg border border-(--color-border-muted) bg-(--color-bg-base) p-4 grid gap-4"
                        >
                          <h4 className="text-sm font-medium text-(--color-text-primary)">
                            段落 {segment.order}
                          </h4>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-visual`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 画面
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-visual`}
                              aria-label={`段落 ${segment.order} 画面`}
                              value={segment.visual}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "visual",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-action`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 动作
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-action`}
                              aria-label={`段落 ${segment.order} 动作`}
                              value={segment.characterAction}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "characterAction",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-dialogue`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 对白
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-dialogue`}
                              aria-label={`段落 ${segment.order} 对白`}
                              value={segment.dialogue}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "dialogue",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-voiceover`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 旁白
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-voiceover`}
                              aria-label={`段落 ${segment.order} 旁白`}
                              value={segment.voiceOver}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "voiceOver",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-audio`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 音频
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-audio`}
                              aria-label={`段落 ${segment.order} 音频`}
                              value={segment.audio}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "audio",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-purpose`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 目的
                            </label>
                            <textarea
                              id={`segment-${sceneIndex}-${segmentIndex}-purpose`}
                              aria-label={`段落 ${segment.order} 目的`}
                              value={segment.purpose}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "purpose",
                                  event.target.value,
                                )
                              }
                              rows={2}
                              className={`${inputClass} resize-y`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`segment-${sceneIndex}-${segmentIndex}-duration`}
                              className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
                            >
                              段落 {segment.order} 时长（秒）
                            </label>
                            <input
                              id={`segment-${sceneIndex}-${segmentIndex}-duration`}
                              aria-label={`段落 ${segment.order} 时长（秒）`}
                              type="number"
                              value={segment.durationSec ?? ""}
                              onChange={(event) =>
                                updateSegment(
                                  sceneIndex,
                                  segmentIndex,
                                  "durationSec",
                                  event.target.value ? Number(event.target.value) : null,
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          );
        }}
      </AsyncState>
    </div>
  );
}
