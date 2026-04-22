# 05 Storyboard To Shot Script Guide

## 目标

实现项目在 `storyboard` 之后的下一个正式生成环节：

`已审核分镜文案 -> 镜头脚本`

这里的“镜头脚本”用于承接当前已经审核通过的 `storyboard`，把偏叙事层的 segment 文案扩写成更接近执行层的镜头脚本结构，供后续 `images` 阶段消费。

当前阶段的目标不是直接出图，也不是直接生成视频，而是产出一个可审核、可修改、可回溯的 `shot_script` 资产。

补充说明：

- 中文上可以称“镜头脚本”或“分镜脚本”
- 为了和后续代码命名统一，本文统一使用 `shot_script`
- 当前阶段已经固定采用 `segment-first` 语义

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `storyboard`

在当前仓库演进方向下，`storyboard` 本身已经依赖：

- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`
- 已审核通过的 `scene_sheets`

因此本阶段默认也可以读取这些已审核结果作为辅助上下文，但正式门禁仍应以 `storyboard_approved` 为准。

### 必需输入

- `sourceStoryboardId`
- `storyboard`

### 建议附带输入

- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`
- `sourceSceneSheetBatchId`
- `sceneSheets`

### 当前阶段的原子规则

当前固定采用：

`一个 storyboard segment = 一个 shot_script segment = N 个 shots`

也就是说：

- `segment` 是当前阶段的生成、保存、重生成、审核原子单位
- 一个 `segment` 内部可以展开为多个真实镜头
- 不再按“整份 `shot_script` 一次生成”理解
- 也不再按“一个 storyboard segment = 一个 shot”理解

## AI 提供方

- `文字 API`

这个阶段本质上仍然是结构化文本生成，不需要图片或视频提供方直接参与。

## Prompt 模板

### 模板职责

该模板负责把已经审核通过的单个 `storyboard segment` 转成可执行的多镜头 `shot_script segment`，并尽量补齐以下信息：

- 该 segment 的镜头拆分
- 每个镜头的主体、画面重点与动作瞬间
- 景别、机位、构图与连续性信息
- 对白、旁白、音效等可执行信息
- 每个镜头时长，以及与 segment 总时长的对齐

### 模板标识

建议模板 key：

`shot_script.segment.generate`

### 模板变量

建议变量结构：

```ts
type ShotScriptSegmentPromptVars = {
  segment: {
    id: string;
    sceneId: string;
    order: number;
    durationSec: number | null;
    visual: string;
    characterAction: string;
    dialogue: string;
    voiceOver: string;
    audio: string;
    purpose: string;
  };
  storyboardTitle?: string | null;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  sceneSheets?: SceneSheetSnapshot[];
};
```

说明：

- `segment` 是必需变量
- `masterPlot`、`characterSheets` 和 `sceneSheets` 不是形式上的硬依赖，但建议作为辅助上下文注入
- 输出应以简体中文为主
- 当前阶段不保存图片 prompt 字段，图片提示词逻辑留到 `images` 阶段

## 输入结构

项目级启动任务建议结构：

```ts
type ShotScriptGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
  storyboard: CurrentStoryboard;
  sourceMasterPlotId?: string;
  masterPlot?: CurrentMasterPlot;
  sourceCharacterSheetBatchId?: string;
  characterSheets?: CharacterSheetSnapshot[];
  sourceSceneSheetBatchId?: string;
  sceneSheets?: SceneSheetSnapshot[];
  promptTemplateKey: "shot_script.segment.generate";
};
```

逐 `segment` 任务建议结构：

```ts
type ShotScriptSegmentGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "shot_script_segment_generate";
  sourceStoryboardId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  segment: {
    id: string;
    order: number;
    durationSec: number | null;
    visual: string;
    characterAction: string;
    dialogue: string;
    voiceOver: string;
    audio: string;
    purpose: string;
  };
  storyboardTitle?: string | null;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  sceneSheets?: SceneSheetSnapshot[];
  promptTemplateKey: "shot_script.segment.generate";
};
```

## 输出结构

这个阶段输出一个项目级文本资产：`shot_script`

建议结构：

```ts
type CurrentShotScript = {
  id: string;
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  segmentCount: number;
  shotCount: number;
  totalDurationSec: number | null;
  segments: ShotScriptSegment[];
};
```

要求：

- `CurrentShotScript.segments[]` 保持与 `storyboard segment` 相同顺序
- `ShotScriptSegment` 是当前阶段的审核与操作单位
- `shots[]` 是该 segment 内部展开后的真实镜头列表
- 当前阶段不保存 `imagePrompt` / `negativePrompt` 等图片阶段字段

## 存储与审核点

建议保存：

1. `storyboard` 快照
2. 可选的 `master_plot` 快照
3. 可选的 `character_sheets` 快照
4. 可选的 `scene_sheets` 快照
5. 模板正文
6. Prompt 变量快照
7. 渲染后的 prompt
8. 文字 API 原始响应
9. 解析后的 `CurrentShotScript`
10. 单个 segment 的人工修改版本

审核动作至少包括：

- 查看某个 segment 的 AI 生成结果
- 人工修改某个 segment 并保存
- 重生成某个 segment
- 审核通过某个 segment
- 执行“全部通过”，把整份 `shot_script` 收口

只有当所有 `segment` 都被审核通过后，才允许进入下一个阶段：

- `shot_script -> images`

## 本阶段暂不处理的内容

- 图片生成任务拆分
- 首帧/尾帧生成
- 视频片段生成
- 自动时间轴拼接
- 转场设计
- 音乐、字幕、配音
