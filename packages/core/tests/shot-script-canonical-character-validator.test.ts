import { describe, expect, it } from "vitest";

import {
  buildShotScriptCanonicalCharacterValidator,
} from "../src/domain/shot-script-canonical-character-validator";

describe("shot script canonical character validator", () => {
  const validator = buildShotScriptCanonicalCharacterValidator([
    {
      characterId: "char_k",
      characterName: "职员K",
      promptTextCurrent: "黑眼圈明显，深色连帽衫。",
      imageAssetPath: "character-sheets/char_k/current.png",
    },
    {
      characterId: "char_agent",
      characterName: "黑衣特工",
      promptTextCurrent: "黑西装，黑墨镜。",
      imageAssetPath: "character-sheets/char_agent/current.png",
    },
  ]);

  it("accepts shots that keep canonical approved character names", () => {
    const violations = validator.validateShots([
      {
        id: "shot_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        order: 1,
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_and_end_frame",
        durationSec: 3,
        purpose: "建立主角状态。",
        visual: "昏暗办公室中景，职员K坐在电脑前。",
        subject: "职员K",
        action: "职员K疲惫地敲击键盘。",
        dialogue: null,
        os: null,
        audio: "键盘声。",
        transitionHint: null,
        continuityNotes: null,
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("rejects unregistered shorthand aliases for approved characters", () => {
    const violations = validator.validateShots([
      {
        id: "shot_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        order: 1,
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_and_end_frame",
        durationSec: 3,
        purpose: "建立主角状态。",
        visual: "昏暗办公室中景，冷色屏幕光打在K的脸上。",
        subject: "K",
        action: "K疲惫地敲击键盘。",
        dialogue: null,
        os: null,
        audio: "键盘声。",
        transitionHint: null,
        continuityNotes: null,
      },
    ]);

    expect(violations).toEqual([
      expect.objectContaining({
        shotId: "shot_1",
        field: "subject",
        canonicalCharacterName: "职员K",
        invalidText: "K",
      }),
    ]);
  });

  it("rejects generic substitutes when an approved character is referenced", () => {
    const violations = validator.validateShots([
      {
        id: "shot_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        order: 1,
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_and_end_frame",
        durationSec: 3,
        purpose: "建立主角状态。",
        visual: "昏暗办公室中景，冷色屏幕光打在职员K的脸上。",
        subject: "职员K",
        action: "年轻男子疲惫地敲击键盘。",
        dialogue: null,
        os: null,
        audio: "键盘声。",
        transitionHint: null,
        continuityNotes: null,
      },
    ]);

    expect(violations).toEqual([
      expect.objectContaining({
        shotId: "shot_1",
        field: "action",
        canonicalCharacterName: "职员K",
        invalidText: "年轻男子",
      }),
    ]);
  });
});
