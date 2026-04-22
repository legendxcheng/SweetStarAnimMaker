# 03 Character Sheets To Scene Sheets Guide

## 目标

实现项目在 `character_sheets` 之后的正式生成环节：

`已审核角色设定/角色图 -> 场景设定/场景图`

这里的“场景设定/场景图”用于把项目里的核心复用场景沉淀成可审核、可重生成、可回溯的正式场景资产，供后续 `storyboard`、`images` 和 `videos` 阶段消费。

当前阶段的目标不是穷举项目里的全部场景，而是先把“人在哪里演”锁定住。

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`

### 必需输入

- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`

### 当前阶段的原子规则

当前固定采用：

`一个核心场景 = 一条 scene_sheet 记录 = 一张当前场景图`

也就是说：

- 当前阶段采用项目级 batch + 场景级审核结构
- 每个 `scene_sheet` 只维护 `1` 张当前主场景图
- 不做多视角或多构图场景包
- 只收录值得提前锁定的核心场景

## AI 提供方

- `文字 API`
  - 用于生成场景提示词和场景约束
- `图片 API`
  - 用于生成主场景图

## Prompt 模板

建议模板键：

- `scene_sheet.prompt.generate`
- `scene_sheet.image.generate`

至少保存：

- 模板正文
- 模板变量
- 渲染后的 prompt
- 原始 provider 返回

## 输入结构

项目级启动任务建议结构：

```ts
type SceneSheetsGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "scene_sheets_generate";
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
};
```

场景级任务建议结构：

```ts
type SceneSheetGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "scene_sheet_generate";
  batchId: string;
  sceneId: string;
  sceneName: string;
  promptTextCurrent: string;
  constraintsText: string;
};
```

## 输出结构

批次摘要建议结构：

```ts
type CurrentSceneSheetBatchSummary = {
  id: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneCount: number;
  approvedSceneCount: number;
  updatedAt: string;
};
```

单场景记录建议结构：

```ts
type SceneSheetRecord = {
  id: string;
  batchId: string;
  projectId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  constraintsText: string;
  imageAssetPath: string | null;
  status: "generating" | "in_review" | "approved" | "failed";
  approvedAt: string | null;
  updatedAt: string;
};
```

## 存储与审核点

建议保存：

1. `master_plot` 快照
2. `character_sheets` 快照
3. 场景 prompt 生成结果
4. 当前场景 prompt
5. 场景约束文本
6. 当前场景图和版本历史
7. provider 元数据

审核动作至少包括：

- 查看当前场景图
- 修改当前 prompt
- 重生成单个场景图
- 审核通过单个场景

只有全部核心场景审核通过后，项目才允许进入：

- `scene_sheets -> storyboard`

## 本阶段暂不处理

- 覆盖项目全部一次性场景
- 每个场景多角度场景包
- 每个 storyboard segment 强制绑定一个 `scene_sheet`
- 首帧/尾帧控制
