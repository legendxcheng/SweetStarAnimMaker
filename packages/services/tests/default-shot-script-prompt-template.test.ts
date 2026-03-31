import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default shot script prompt template", () => {
  it("keeps the repository-level shot script prompt segment-first and Chinese", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/shot_script.segment.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("输出语言必须是简体中文");
    expect(template).toContain("一个 segment 可以拆成多个 shots");
    expect(template).toContain("shotCode");
    expect(template).toContain("不要输出 imagePrompt、negativePrompt、motionHint 等出图字段");
    expect(template).toContain("{{storyboardTitle}}");
    expect(template).toContain("{{segment.visual}}");
    expect(template).toContain("{{previousSegment.visual}}");
    expect(template).toContain("{{nextSegment.visual}}");
    expect(template).toContain("{{sceneSegmentIndex}}");
    expect(template).toContain("{{sceneSegmentCount}}");
    expect(template).toContain("{{continuityGoal}}");
    expect(template).toContain("{{segmentMaxSpokenChars}}");
    expect(template).toContain("{{spokenTextBudgetRule}}");
    expect(template).toContain("{{shotSpokenTextBudgetRule}}");
    expect(template).toContain("对白 + 旁白/OS");
    expect(template).toContain("1 秒 3 字");
    expect(template).toContain("已批准角色设定");
    expect(template).toContain("{{characterSheets}}");
    expect(template).toContain("必须使用角色设定中的标准角色名");
    expect(template).toContain("禁止使用未登记简称");
    expect(template).toContain("承接状态");
    expect(template).toContain("事件推进句");
    expect(template).toContain("交接状态");
    expect(template).toContain("如果 previousSegment 存在，第一条 shot 不要重新建立场景");
    expect(template).toContain("summary 必须描述状态变化");
    expect(template).toContain("不能只写氛围");
    expect(template).toContain("purpose 必须服务事件推进");
    expect(template).toContain("不要试图为每个镜头选择唯一策略");
    expect(template).toContain("请先识别镜头中的关键状态节点");
    expect(template).toContain("anchors");
    expect(template).toContain("segments");
    expect(template).toContain("关键节点");
    expect(template).toContain("非关键过程");
    expect(template).toContain("如果两个关键节点之间不可平滑过渡");
    expect(template).toContain("角色身份或形态变化");
    expect(template).toContain("空间跳跃");
    expect(template).toContain("多阶段行为压缩");
    expect(template).toContain("必须拆镜头 或 改用首帧生成");
  });
});
