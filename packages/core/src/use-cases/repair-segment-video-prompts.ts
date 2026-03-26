import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { buildSegmentVideoPrompt } from "./build-segment-video-prompt";

type SegmentVideoWithPromptFields = Awaited<
  ReturnType<VideoRepository["findSegmentById"]>
> extends infer T
  ? NonNullable<T>
  : never;

export async function repairSegmentVideoPromptsIfMissing(
  dependencies: {
    shotScriptStorage: ShotScriptStorage;
    videoStorage: VideoStorage;
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

    const promptTemplate = await dependencies.videoStorage.readPromptTemplate({
      storageDir: project.storageDir,
      promptTemplateKey: "segment_video.generate",
    });

    fallbackPrompt = buildSegmentVideoPrompt(promptTemplate, {
      segmentSummary: scriptSegment.summary,
      shotsSummary: `${scriptShot.shotCode}: ${scriptShot.action}`,
    }).trim();
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
