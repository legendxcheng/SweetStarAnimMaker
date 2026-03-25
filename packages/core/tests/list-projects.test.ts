import { describe, expect, it, vi } from "vitest";

import { createListProjectsUseCase } from "../src/index";

describe("list projects use case", () => {
  it("loads current master plots for projects that have one", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: "proj_20260320_ab12cd",
          name: "Sky Choir",
          slug: "sky-choir",
          storageDir: "projects/proj_20260320_ab12cd-sky-choir",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 100,
          currentMasterPlotId: "mp_20260320_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: null,
          currentShotScriptId: "shot_script_20260322_ab12cd",
          currentImageBatchId: "image_batch_1",
          currentVideoBatchId: "video_batch_1",
          status: "master_plot_in_review",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:30:00.000Z",
          premiseUpdatedAt: "2026-03-20T10:00:00.000Z",
        },
        {
          id: "proj_20260320_ef34gh",
          name: "Iron Star",
          slug: "iron-star",
          storageDir: "projects/proj_20260320_ef34gh-iron-star",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: null,
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: null,
          currentVideoBatchId: null,
          status: "premise_ready",
          createdAt: "2026-03-20T11:00:00.000Z",
          updatedAt: "2026-03-20T11:05:00.000Z",
          premiseUpdatedAt: "2026-03-20T11:00:00.000Z",
        },
      ]),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_20260320_ab12cd",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
        sourceTaskId: "task_20260320_ab12cd",
        updatedAt: "2026-03-20T10:30:00.000Z",
        approvedAt: null,
      }),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_20260322_ab12cd",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_20260320_ab12cd",
        sourceTaskId: "task_20260322_shot_script",
        updatedAt: "2026-03-22T12:00:00.000Z",
        approvedAt: null,
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Establish the flooded market",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by hanging lanterns",
            actionMoment: "Rin pauses at the waterline",
            emotionTone: "uneasy anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: null,
            durationSec: 4,
          },
        ],
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "char_batch_v1",
        projectId: "proj_20260320_ab12cd",
        projectStorageDir: "projects/proj_20260320_ab12cd-sky-choir",
        sourceMasterPlotId: "mp_20260320_ab12cd",
        characterCount: 2,
        storageDir: "projects/proj_20260320_ab12cd-sky-choir/character-sheets/batches/char_batch_v1",
        manifestRelPath: "character-sheets/batches/char_batch_v1/manifest.json",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:35:00.000Z",
      }),
      listCharactersByBatchId: vi.fn().mockResolvedValue([
        { id: "char_rin_1", status: "approved" },
        { id: "char_ivo_2", status: "in_review" },
      ]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "image_batch_1",
        projectId: "proj_20260320_ab12cd",
        projectStorageDir: "projects/proj_20260320_ab12cd-sky-choir",
        sourceShotScriptId: "shot_script_20260322_ab12cd",
        segmentCount: 1,
        totalFrameCount: 2,
        storageDir: "projects/proj_20260320_ab12cd-sky-choir/images/batches/image_batch_1",
        manifestRelPath: "images/batches/image_batch_1/manifest.json",
        createdAt: "2026-03-23T12:00:00.000Z",
        updatedAt: "2026-03-23T12:10:00.000Z",
      }),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        { id: "frame_1", imageStatus: "approved" },
        { id: "frame_2", imageStatus: "in_review" },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "video_batch_1",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_20260322_ab12cd",
        segmentCount: 1,
        updatedAt: "2026-03-25T12:00:00.000Z",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        { id: "video_segment_1", status: "approved" },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };
    const useCase = createListProjectsUseCase({
      repository,
      masterPlotStorage,
      storyboardStorage,
      shotScriptStorage,
      characterSheetRepository,
      shotImageRepository,
      videoRepository,
    });

    const result = await useCase.execute();

    expect(masterPlotStorage.readCurrentMasterPlot).toHaveBeenCalledTimes(1);
    expect(masterPlotStorage.readCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260320_ab12cd-sky-choir",
    });
    expect(result[0].currentMasterPlot?.title).toBe("The Last Sky Choir");
    expect(result[0].currentCharacterSheetBatch?.approvedCharacterCount).toBe(1);
    expect(result[0].currentShotScript?.shotCount).toBe(1);
    expect(result[0].currentImageBatch?.id).toBe("image_batch_1");
    expect(result[0].currentImageBatch?.approvedFrameCount).toBe(1);
    expect(result[0].currentVideoBatch?.approvedSegmentCount).toBe(1);
    expect(result[1].currentMasterPlot).toBeNull();
    expect(result[1].currentCharacterSheetBatch).toBeNull();
    expect(result[1].currentShotScript).toBeNull();
    expect(result[1].currentImageBatch).toBeNull();
    expect(result[1].currentVideoBatch).toBeNull();
  });
});
