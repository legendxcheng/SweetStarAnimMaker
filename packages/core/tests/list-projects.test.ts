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
        shotCount: 1,
        totalRequiredFrameCount: 2,
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
        shotCount: 1,
        updatedAt: "2026-03-25T12:00:00.000Z",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        { id: "video_segment_1", status: "approved" },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
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
    expect(result[0].currentImageBatch?.approvedShotCount).toBe(1);
    expect(result[0].currentVideoBatch?.id).toBe("video_batch_1");
    expect(result[1].currentMasterPlot).toBeNull();
    expect(result[1].currentCharacterSheetBatch).toBeNull();
    expect(result[1].currentShotScript).toBeNull();
    expect(result[1].currentImageBatch).toBeNull();
    expect(result[1].currentVideoBatch).toBeNull();
  });

  it("normalizes legacy image and video batch summaries for existing projects", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: "proj_legacy_1",
          name: "Legacy Project",
          slug: "legacy-project",
          storageDir: "projects/proj_legacy_1",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 64,
          currentMasterPlotId: null,
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: "image_batch_legacy",
          currentVideoBatchId: "video_batch_legacy",
          status: "videos_in_review",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:30:00.000Z",
          premiseUpdatedAt: "2026-03-20T10:00:00.000Z",
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

    const useCase = createListProjectsUseCase({
      repository,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "image_batch_legacy",
          projectId: "proj_legacy_1",
          projectStorageDir: "projects/proj_legacy_1",
          sourceShotScriptId: "shot_script_legacy",
          segmentCount: 2,
          totalFrameCount: 3,
          storageDir: "projects/proj_legacy_1/images/batches/image_batch_legacy",
          manifestRelPath: "images/batches/image_batch_legacy/manifest.json",
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
      },
      videoRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi
          .fn()
          .mockResolvedValueOnce({
            id: "video_batch_legacy",
            projectId: "proj_legacy_1",
            projectStorageDir: "projects/proj_legacy_1",
            sourceImageBatchId: "image_batch_legacy",
            sourceShotScriptId: "shot_script_legacy",
            segmentCount: 1,
            shotCount: 0,
            updatedAt: "2026-03-25T12:00:00.000Z",
          }),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn().mockResolvedValue([
          { id: "video_segment_1", status: "approved" },
        ]),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
      },
    });

    const result = await useCase.execute();

    expect(result[0].currentImageBatch).toEqual(
      expect.objectContaining({
        shotCount: 2,
        totalRequiredFrameCount: 3,
        approvedShotCount: 1,
      }),
    );
    expect(result[0].currentVideoBatch).toEqual(
      expect.objectContaining({
        shotCount: 1,
        approvedShotCount: 1,
      }),
    );
  });

  it("drops empty current video batches so project list responses stay valid", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: "proj_empty_video",
          name: "Empty Video",
          slug: "empty-video",
          storageDir: "projects/proj_empty_video",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 64,
          currentMasterPlotId: null,
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: null,
          currentVideoBatchId: "video_batch_empty",
          status: "videos_generating",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:30:00.000Z",
          premiseUpdatedAt: "2026-03-20T10:00:00.000Z",
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

    const useCase = createListProjectsUseCase({
      repository,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listFramesByBatchId: vi.fn(),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
      },
      videoRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "video_batch_empty",
          projectId: "proj_empty_video",
          projectStorageDir: "projects/proj_empty_video",
          sourceImageBatchId: "image_batch_missing",
          sourceShotScriptId: "shot_script_missing",
          shotCount: 0,
          updatedAt: "2026-03-25T12:00:00.000Z",
        }),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn().mockResolvedValue([]),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
      },
    });

    const result = await useCase.execute();

    expect(result[0].currentVideoBatch).toBeNull();
  });

  it("prefers shot summaries over frame summaries for shot-first image batches", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: "proj_shot_first_list",
          name: "Shot First List",
          slug: "shot-first-list",
          storageDir: "projects/proj_shot_first_list",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 64,
          currentMasterPlotId: null,
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: "image_batch_shot_first",
          currentVideoBatchId: null,
          status: "images_approved",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:30:00.000Z",
          premiseUpdatedAt: "2026-03-20T10:00:00.000Z",
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

    const listFramesByBatchId = vi.fn().mockResolvedValue([
      { id: "frame_1", imageStatus: "approved" },
      { id: "frame_2", imageStatus: "approved" },
      { id: "frame_3", imageStatus: "approved" },
    ]);
    const listShotsByBatchId = vi.fn().mockResolvedValue([
      { id: "shot_1", referenceStatus: "approved" },
      { id: "shot_2", referenceStatus: "approved" },
    ]);

    const useCase = createListProjectsUseCase({
      repository,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "image_batch_shot_first",
          projectId: "proj_shot_first_list",
          projectStorageDir: "projects/proj_shot_first_list",
          sourceShotScriptId: "shot_script_shot_first",
          shotCount: 2,
          totalRequiredFrameCount: 3,
          storageDir: "projects/proj_shot_first_list/images/batches/image_batch_shot_first",
          manifestRelPath: "images/batches/image_batch_shot_first/manifest.json",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:10:00.000Z",
        }),
        listFramesByBatchId,
        listShotsByBatchId,
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
      },
      videoRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn(),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
      },
    });

    const result = await useCase.execute();

    expect(result[0].currentImageBatch).toEqual(
      expect.objectContaining({
        shotCount: 2,
        totalRequiredFrameCount: 3,
        approvedShotCount: 2,
      }),
    );
    expect(listShotsByBatchId).toHaveBeenCalledWith("image_batch_shot_first");
    expect(listFramesByBatchId).not.toHaveBeenCalled();
  });
});
