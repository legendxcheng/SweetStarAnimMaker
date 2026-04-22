# 04 Scene Sheets To Storyboard Guide

## 目标

实现项目在 `scene_sheets` 之后的正式生成环节：

`已审核场景设定/场景图 -> 分镜文案`

这里的“分镜文案”用于把已经稳定的角色资产和核心场景资产组织成项目级叙事分镜结构，供后续 `shot_script` 阶段扩写。

当前阶段的目标不是直接出镜头脚本，也不是直接出图，而是产出可审核、可修改、可回溯的 `storyboard` 资产。

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`
- 已审核通过的 `scene_sheets`

### 必需输入

- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`
- `sourceSceneSheetBatchId`
- `sceneSheets`

### 当前阶段的原子规则

当前固定采用：

`一个 storyboard = N 个 segment`

也就是说：

- `storyboard` 是项目级文案资产
- `segment` 是后续 `shot_script` 的上游叙事原子
- `scene_sheets` 是可选引用的核心场景库，而不是每段必须绑定的外键表

## AI 提供方

- `文字 API`

## Prompt 模板

建议模板键：

- `storyboard.generate`

模板变量建议至少包含：

- `masterPlot`
- `characterSheets`
- `sceneSheets`

其中 `sceneSheets` 的作用是给模型一组可复用的稳定环境锚点。

## 输入结构

项目级任务建议结构：

```ts
type StoryboardGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "storyboard_generate";
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sourceSceneSheetBatchId: string;
  masterPlot: CurrentMasterPlot;
  characterSheets: CharacterSheetSnapshot[];
  sceneSheets: SceneSheetSnapshot[];
  promptTemplateKey: "storyboard.generate";
};
```

## 输出结构

建议结构：

```ts
type CurrentStoryboard = {
  id: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sourceSceneSheetBatchId: string;
  title: string | null;
  updatedAt: string;
  approvedAt: string | null;
  segments: StoryboardSegment[];
};
```

要求：

- `segments[]` 保持叙事顺序
- 每个 segment 应包含足够明确的视觉、动作、对白、音频和叙事目的信息
- 可以引用核心场景，也可以描述临时性或抽象场景

## 存储与审核点

建议保存：

1. `master_plot` 快照
2. `character_sheets` 快照
3. `scene_sheets` 快照
4. 模板正文和变量
5. 渲染后的 prompt
6. provider 原始响应
7. 解析后的 `storyboard`

审核动作至少包括：

- 查看当前 `storyboard`
- 人工修改并保存
- 重生成
- 审核通过

只有审核通过后，项目才允许进入：

- `storyboard -> shot_script`

## 本阶段暂不处理

- 逐段强制绑定 `scene_sheet`
- 直接生成镜头级 `shot_script`
- 直接生成图片 prompt
- 直接生成视频 prompt
