# 05 Shot Script To Images Guide

## 目标

实现项目在 `shot_script` 之后的下一个正式生成环节：

`已审核镜头脚本 -> segment 首帧/尾帧`

这里的“出图”用于承接当前已经审核通过的 `shot_script`，把每一个 `shot_script segment` 落成一对可审核、可替换、可回溯的静态画面资产：

- `start_frame`
- `end_frame`

这两张图是当前 segment 的边界帧资产，供后续视频阶段或 `final_cut` 继续消费。

当前阶段的目标不是直接生成视频片段，也不是直接导出成片，而是先产出一批按 `segment` 管理的稳定帧图。

补充说明：

- 本文统一把这个阶段称为 `images`
- 当前阶段采用 `segment-first` 语义
- 当前阶段不再按“一个 shot 一张图”理解

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `shot_script`

在当前仓库演进方向下，`shot_script` 本身已经依赖：

- 已审核通过的 `storyboard`
- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`

因此本阶段默认也可以读取这些已审核结果作为辅助上下文，但正式门禁仍应以 `shot_script_approved` 为准。

### 必需输入

- `sourceShotScriptId`
- `shotScript`

### 建议附带输入

- `sourceStoryboardId`
- `storyboard`
- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`

### 当前阶段的原子规则

当前固定采用：

`一个 shot_script segment = 两张当前图片 = start_frame + end_frame`

也就是说：

- 当前阶段的生成、重生成、审核原子单位是 `segment`
- 每个 `segment` 恰好维护两张当前图片
- 不为单个 shot 单独生成图片
- 不在这一阶段直接生成视频片段

## AI 提供方

- `图片 API`

这个阶段本质上是结构化图片生成，不需要视频提供方直接参与。

当前只需要约定“这是一个图片生成请求”，不需要在这篇 Guide 里定义更细的 provider 抽象。

## Prompt 模板

### 模板职责

本阶段必须绑定正式 Prompt 模板。模板负责基于单个 `shot_script segment` 及其内部 `shots[]`，分别派生：

- `start_frame` 的图片请求
- `end_frame` 的图片请求

模板或模板组应尽量补齐以下信息：

- 当前 segment 的主体角色与环境
- segment 内多镜头的起始状态和结束状态
- 角色外观继承与连续性约束
- 景别、机位、构图与氛围
- 可选的负向约束

说明：

- 当前阶段的图片提示词可以在任务处理中动态推导
- 这一版不要求把 `start_frame` / `end_frame` 的 prompt 作为独立长期资产单独存储

### 模板标识

建议先按阶段级模板管理，例如：

`segment_frames.generate`

### 模板变量

建议变量结构：

```ts
type SegmentFramesPromptVars = {
  segment: {
    segmentId: string;
    sceneId: string;
    order: number;
    name: string | null;
    summary: string;
    durationSec: number | null;
    shots: Array<{
      id: string;
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
    }>;
  };
  storyboard?: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
  };
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
- `storyboard`、`masterPlot` 和 `characterSheets` 不是形式上的硬依赖，但建议作为辅助上下文注入
- 如果图片提供方支持参考图输入，可以把已审核角色图路径单独传给 provider，而不是直接内嵌进 prompt 文本

### 模板资产要求

至少保存：

- 模板正文
- 本次渲染变量
- 渲染后的 prompt 文本或等价请求快照

当前先继续采用“系统默认模板 + 项目级覆写模板”。

## 输入结构

这个阶段建议采用一个项目级批处理任务，加一个逐 `segment` 出图任务。

项目级启动任务建议结构：

```ts
type ImagesGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "images_generate";
  sourceShotScriptId: string;
  shotScript: CurrentShotScript;
  sourceStoryboardId?: string;
  storyboard?: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
  };
  sourceMasterPlotId?: string;
  masterPlot?: CurrentMasterPlot;
  sourceCharacterSheetBatchId?: string;
  characterSheets?: CharacterSheetSnapshot[];
  promptTemplateKey: "segment_frames.generate";
};
```

逐 `segment` 任务建议结构：

```ts
type SegmentFramesGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "segment_frames_generate";
  batchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  segment: ShotScriptSegment;
  storyboard?: {
    id: string;
    title: string | null;
    episodeTitle: string | null;
  };
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  promptTemplateKey: "segment_frames.generate";
};
```

要求：

- 项目级任务必须带上 `shotScript` 快照，保证任务可回放
- 项目级任务负责为每个 `segment` 创建两条当前图片记录
- 然后为每个 `segment` 单独创建一个 `segment_frames_generate` 任务
- 单个 `segment` 任务只更新该 `segment` 的两张图片
- 如果注入 `storyboard`、`masterPlot`、`characterSheets`，也应保存当时的快照

## 输出结构

这个阶段输出一个项目级图片批次摘要，以及按 `segment` 管理的帧图记录。

批次摘要建议结构：

```ts
type CurrentImageBatchSummary = {
  id: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
};
```

单条帧图记录建议结构：

```ts
type SegmentFrameImageRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  frameType: "start_frame" | "end_frame";
  status: "generating" | "in_review" | "approved" | "failed";
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
};
```

字段意图：

- `segmentId` / `sceneId`
  - 保证可以追溯回原始 `shot_script segment`
- `frameType`
  - 明确这是 `start_frame` 还是 `end_frame`
- `order`
  - 保持与上游 segment 顺序一致
- `imageAssetPath`
  - 当前稳定图片路径，供 Studio 和后续阶段直接读取

要求：

- 每个 `segment` 必须恰好对应两条当前记录
- 这两条记录必须分别是 `start_frame` 和 `end_frame`
- 输出结构必须稳定，后续视频阶段或 `final_cut` 可直接引用
- 当前阶段不再输出旧的“按 shot 平铺的 image 列表”语义

## 存储与审核点

### 建议存储内容

1. 本次使用的 `shot_script` 快照
2. 可选的 `storyboard` 快照
3. 可选的 `master_plot` 快照
4. 可选的 `character_sheets` 快照
5. Prompt 模板正文
6. Prompt 变量快照
7. 渲染后的请求快照
8. 图片 API 原始响应元数据
9. 当前图片文件
10. 当前图片元数据

### 建议文件路径

```text
<workspace>/
  prompt-templates/
    segment_frames.generate.txt

  .local-data/projects/<project-id>-<slug>/
    images/
      current-batch.json
      batches/
        <batch-id>/
          manifest.json
          segments/
            <segment-id>/
              start-frame/
                current.png
                current.json
                versions/
              end-frame/
                current.png
                current.json
                versions/

    prompt-templates/
      segment_frames.generate.txt

    tasks/
      <task-id>/
        input.json
        output.json
        log.txt
        prompt-snapshot.json
        raw-response.txt
```

说明：

- 全局默认模板位于 `prompt-templates/segment_frames.generate.txt`
- 项目级覆写模板位于 `.local-data/projects/<project>/prompt-templates/segment_frames.generate.txt`
- `current-batch.json` 方便项目详情页和下游阶段直接读取
- 当前以 `segment/start-frame` 与 `segment/end-frame` 的目录结构保存当前结果和历史版本

### 审核点

这个阶段建议采用“按 segment 审核”而不是“按单张图拆散审核”：

- 查看当前 `segment` 的首帧和尾帧
- 重生成当前 `segment` 的两张图
- 审核通过当前 `segment`
- 执行“全部通过”，把整批 `images` 收口

只有当所有 `segment` 的当前两张图都被审核通过后，项目才允许进入下一个阶段：

- `images -> final_cut`

## 本阶段暂不处理的内容

当前这篇 Guide 不展开这些内容：

- 一个 shot 一张图
- 一个 segment 生成多组候选首尾帧
- 手工上传替代图片
- 视频片段生成
- 自动时间轴拼接
- 转场、字幕、音乐、配音

这篇文档只用于先把 `shot_script -> images` 这个按 `segment` 生成首帧/尾帧的正式图片阶段锁定住，并为后续视频阶段或 `final_cut` 提供稳定输入。
