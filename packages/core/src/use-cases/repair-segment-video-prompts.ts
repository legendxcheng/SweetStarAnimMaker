import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoPromptProvider } from "../ports/video-prompt-provider";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { buildVideoPromptProviderInput } from "./build-video-prompt-provider-input";

type SegmentVideoWithPromptFields = Awaited<
  ReturnType<VideoRepository["findSegmentById"]>
> extends infer T
  ? NonNullable<T>
  : never;

export async function repairSegmentVideoPromptsIfMissing(
  dependencies: {
    shotScriptStorage: ShotScriptStorage;
    shotImageRepository: ShotImageRepository;
    videoStorage: VideoStorage;
    videoPromptProvider: VideoPromptProvider;
    videoRepository: VideoRepository;
  },
  project: NonNullable<Awaited<ReturnType<ProjectRepository["findById"]>>>,
  segment: SegmentVideoWithPromptFields,
) {
  const promptTextSeed = (segment.promptTextSeed ?? "").trim();
  const promptTextCurrent = (segment.promptTextCurrent ?? "").trim();

  if (promptTextSeed.length > 0 && promptTextCurrent.length > 0) {
    return segment;
  }

  let fallbackPrompt = promptTextSeed || promptTextCurrent;

  if (!fallbackPrompt) {
    const shotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
      storageDir: project.storageDir,
    });

    if (!shotScript) {
      throw new CurrentShotScriptNotFoundError(project.id);
    }

    const scriptSegment = shotScript.segments.find(
      (item) => item.segmentId === segment.segmentId && item.sceneId === segment.sceneId,
    );
    const scriptShot = scriptSegment?.shots.find((item) => item.id === segment.shotId);

    if (!scriptSegment || !scriptShot) {
      throw new CurrentShotScriptNotFoundError(project.id);
    }

    if (!dependencies.shotImageRepository.listShotsByBatchId) {
      throw new CurrentShotScriptNotFoundError(project.id);
    }

    const shotReference = (
      await dependencies.shotImageRepository.listShotsByBatchId(segment.sourceImageBatchId)
    ).find((item) => item.shotId === segment.shotId);

    if (!shotReference) {
      throw new CurrentShotScriptNotFoundError(project.id);
    }

    const promptPlan = await dependencies.videoPromptProvider.generateVideoPrompt(
      buildVideoPromptProviderInput({
        projectId: project.id,
        segment: scriptSegment,
        shot: scriptShot,
        shotReference,
      }),
    );

    fallbackPrompt = promptPlan.finalPrompt.trim();
    await dependencies.videoStorage.writePromptPlan({
      segment: {
        ...segment,
        promptTextSeed: promptTextSeed || fallbackPrompt,
        promptTextCurrent: promptTextCurrent || fallbackPrompt,
      },
      planning: {
        finalPrompt: promptPlan.finalPrompt,
        dialoguePlan: promptPlan.dialoguePlan,
        audioPlan: promptPlan.audioPlan,
        visualGuardrails: promptPlan.visualGuardrails,
        rationale: promptPlan.rationale,
        provider: promptPlan.provider,
        model: promptPlan.model,
        rawResponse: promptPlan.rawResponse,
      },
    });
  }

  const repairedSegment = {
    ...segment,
    promptTextSeed: promptTextSeed || fallbackPrompt,
    promptTextCurrent: promptTextCurrent || fallbackPrompt,
    promptUpdatedAt: (segment.promptUpdatedAt ?? "").trim() || segment.updatedAt,
  };

  await dependencies.videoRepository.updateSegment(repairedSegment);

  return repairedSegment;
}
