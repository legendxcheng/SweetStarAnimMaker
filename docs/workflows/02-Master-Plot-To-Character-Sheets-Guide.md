# 02 Master Plot To Character Sheets Guide

## 目标

实现项目在 `master_plot` 之后的正式生成环节：

`已审核总剧情 -> 角色设定/角色图`

这里的“角色设定/角色图”用于把剧情中的主角色沉淀成可审核、可重生成、可回溯的正式角色资产，供后续 `scene_sheets`、`storyboard`、`images` 和 `videos` 阶段消费。

当前阶段的目标不是直接出分镜，也不是直接出视频，而是先把“谁在演”锁定住。

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `master_plot`

### 必需输入

- `sourceMasterPlotId`
- `masterPlot`

### 当前阶段的原子规则

当前固定采用：

`一个主角色 = 一条 character_sheet 记录 = 一张当前角色图`

也就是说：

- 当前阶段采用项目级 batch + 角色级审核结构
- 一个角色只维护一条当前正式记录
- 允许角色级改 prompt、重生成和审核

## AI 提供方

- `文字 API`
  - 用于生成角色提示词
- `图片 API`
  - 用于生成角色图

## Prompt 模板

建议模板键：

- `character_sheet.prompt.generate`
- `character_sheet.image.generate`

至少保存：

- 模板正文
- 模板变量
- 渲染后的 prompt
- 原始 provider 返回

## 输入结构

项目级启动任务建议结构：

```ts
type CharacterSheetsGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "character_sheets_generate";
  sourceMasterPlotId: string;
  masterPlot: CurrentMasterPlot;
};
```

角色级任务建议结构：

```ts
type CharacterSheetGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "character_sheet_generate";
  batchId: string;
  characterId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextCurrent: string;
};
```

## 输出结构

批次摘要建议结构：

```ts
type CurrentCharacterSheetBatchSummary = {
  id: string;
  sourceMasterPlotId: string;
  characterCount: number;
  approvedCharacterCount: number;
  updatedAt: string;
};
```

单角色记录建议结构：

```ts
type CharacterSheetRecord = {
  id: string;
  batchId: string;
  projectId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  imageAssetPath: string | null;
  status: "generating" | "in_review" | "approved" | "failed";
  approvedAt: string | null;
  updatedAt: string;
};
```

## 存储与审核点

建议保存：

1. `master_plot` 快照
2. 角色 prompt 生成结果
3. 当前角色 prompt
4. 当前角色图和版本历史
5. provider 元数据

审核动作至少包括：

- 查看当前角色图
- 修改当前 prompt
- 重生成单个角色图
- 审核通过单个角色

只有全部角色审核通过后，项目才允许进入：

- `character_sheets -> scene_sheets`

## 本阶段暂不处理

- 多套服装
- 多姿态角色包
- 非主角色 extras
- 手工绑定复杂关系图
