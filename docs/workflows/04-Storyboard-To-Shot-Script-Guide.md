# 04 Storyboard To Shot Script Guide

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

因此本阶段默认也可以读取这些已审核结果作为辅助上下文，但正式门禁仍应以 `storyboard_approved` 为准。

### 必需输入

- `sourceStoryboardId`
- `storyboard`

### 建议附带输入

- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`

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

当前只需要约定“这是一个文本生成请求”，不需要在这篇 Guide 里定义更细的 provider 抽象。

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
  characterSheets?: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath?: string | null;
  }>;
};
```

说明：

- `segment` 是必需变量
- `masterPlot` 和 `characterSheets` 不是形式上的硬依赖，但建议作为辅助上下文注入
- 输出应以简体中文为主
- 当前阶段不保存图片 prompt 字段，图片提示词逻辑留到 `images` 阶段

### 模板资产要求

至少保存：

- 模板正文
- 本次渲染变量
- 渲染后的 prompt 文本

当前先继续采用“系统默认模板 + 项目级覆写模板”。

## 输入结构

这个阶段建议采用一个项目级启动任务，加一个逐 `segment` 生成任务。

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
  promptTemplateKey: "shot_script.segment.generate";
};
```

要求：

- 项目级任务必须带上 `storyboard` 快照，保证任务可回放
- 项目级任务负责创建一份 `shot_script shell`
- 然后为每个 `storyboard segment` 单独创建一个 `shot_script_segment_generate` 任务
- 如果注入 `masterPlot` 和 `characterSheets`，也应保存当时的快照
- 单个 `segment` 的生成、保存和审核不能影响其他 `segment`

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

type ShotScriptSegment = {
  segmentId: string;
  sceneId: string;
  order: number;
  name: string | null;
  summary: string;
  durationSec: number | null;
  status: "pending" | "generating" | "in_review" | "approved";
  lastGeneratedAt: string | null;
  approvedAt: string | null;
  shots: ShotScriptItem[];
};

type ShotScriptItem = {
  id: string;
  segmentId: string;
  sceneId: string;
  order: number;
  shotCode: string;
  durationSec: number | null;
  purpose: string;
  visual: string;
  subject: string;
  action: string;
  dialogue: string | null;
  os: string | null;
  audio: string | null;
  transitionHint: string | null;
  continuityNotes: string | null;
};
```

字段意图：

- `CurrentShotScript.segments[]`
  - 保持与 `storyboard segment` 相同顺序
- `ShotScriptSegment`
  - 是当前阶段的审核与操作单位
- `ShotScriptSegment.shots[]`
  - 是该 segment 内部展开后的真实镜头列表
- `ShotScriptItem`
  - 必须足够具体、可执行、可人工审核

要求：

- 一个 `ShotScriptSegment` 必须回溯到唯一的 `storyboard segment`
- 一个 `ShotScriptSegment` 内必须至少有 `1` 个 shot
- 所有面向人工审核的字段应以简体中文为主
- 当前阶段不再输出旧的平铺 `shots[]` 项目级结构
- 当前阶段不保存 `imagePrompt` / `negativePrompt` 等图片阶段字段

## 存储与审核点

### 建议存储内容

1. 本次使用的 `storyboard` 快照
2. 可选的 `master_plot` 快照
3. 可选的 `character_sheets` 快照
4. Prompt 模板正文
5. Prompt 变量快照
6. 渲染后的 prompt
7. 文字 API 原始响应
8. 解析后的 `CurrentShotScript`
9. 单个 segment 的人工修改版本

### 建议文件路径

```text
<workspace>/
  prompt-templates/
    shot_script.segment.generate.txt

  .local-data/projects/<project-id>-<slug>/
    shot-script/
      current.json
      current.md
      versions/
        v1-ai.json
        v1-ai.md
        v2-human.json
        v2-human.md

    prompt-templates/
      shot_script.segment.generate.txt

    tasks/
      <task-id>/
        input.json
        output.json
        log.txt
        prompt-snapshot.json
        raw-response.txt
```

说明：

- 全局默认模板位于 `prompt-templates/shot_script.segment.generate.txt`
- 项目级覆写模板位于 `.local-data/projects/<project>/prompt-templates/shot_script.segment.generate.txt`
- `current.*` 方便下游直接读取
- `versions/*` 方便审核和回溯

### 审核点

这个阶段必须支持以下动作：

- 查看某个 segment 的 AI 生成结果
- 人工修改某个 segment 并保存
- 重生成某个 segment
- 审核通过某个 segment
- 执行“全部通过”，把整份 `shot_script` 收口

只有当所有 `segment` 都被审核通过后，才允许进入下一个阶段：

- `shot_script -> images`

## 本阶段暂不处理的内容

当前这篇 Guide 不展开这些内容：

- 图片生成任务拆分
- 首帧/尾帧生成
- 视频片段生成
- 自动时间轴拼接
- 转场设计
- 音乐、字幕、配音

这篇文档只用于先把 `storyboard -> shot_script` 这个 `segment-first` 文本结构化环节锁定住，并为后续 `images` 阶段提供稳定输入。
