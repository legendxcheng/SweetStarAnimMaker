# 06 Shot Script To Images Guide

## 目标

实现项目在 `shot_script` 之后的正式生成环节：

`已审核镜头脚本 -> segment 关键画面`

这里的“出图”用于把每一个已审核 `shot_script segment` 落成一条可审核、可替换、可回溯的静态关键画面记录。每个 `segment` 内部仍然包含多个 `shot`，但这些 `shot` 只作为当前段画面规划的上下文输入，不再作为图片阶段主表单或主输出结构。

当前阶段的目标不是直接生成视频片段，也不是导出成片，而是先产出一批按 `segment` 管理的稳定关键画面资产，供后续 `videos` 阶段消费。

补充说明：

- 本文统一把这个阶段称为 `images`
- 当前阶段采用 `segment-first` 语义
- 当前图片表单和主返回结构只保留 `segment.startFrame` 与可选 `segment.endFrame`
- `segment.shots[]` 只作为 prompt 规划和参考信息输入

## 上游依赖

- 已审核通过的 `shot_script`

辅助上下文仍可读取：

- 已审核通过的 `storyboard`
- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`
- 已审核通过的 `scene_sheets`

正式门禁仍应以 `shot_script_approved` 为准。

## 当前阶段的原子规则

当前固定采用：

`一个 shot_script segment = 一条 segment 图片记录 = startFrame + 可选 endFrame`

也就是说：

- 项目级有一个当前 `image batch`
- `segment` 是当前阶段的正式审核原子单位
- 每个 `segment` 必须有 `startFrame`
- `endFrame` 是可选关键画面，只在该段需要稳定终态时保留
- 是否需要 `endFrame` 由该段聚合后的 `frameDependency` 决定：
  - 该段所有 `shot` 都是 `start_frame_only` 时，只保留 `startFrame`
  - 只要段内任一 `shot` 是 `start_and_end_frame`，则该段保留 `endFrame`
- 用户最终按 `segment` 查看、重生成和审核

## Prompt 模板

建议模板键：

`shot_reference.generate`

模板变量建议至少包含：

```ts
type ShotReferencePromptVars = {
  segment: {
    id: string;
    sceneId: string;
    segmentId: string;
    order: number;
    name: string | null;
    summary: string;
    frameDependency: "start_frame_only" | "start_and_end_frame";
    sourceShotIds: string[];
    shots: Array<{
      id: string;
      shotCode: string;
      order: number;
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
      frameDependency: "start_frame_only" | "start_and_end_frame";
    }>;
  };
  frameType: "start_frame" | "end_frame";
  storyboard?: CurrentStoryboard;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  sceneSheets?: SceneSheetSnapshot[];
  resolvedCharacters?: CharacterSheetSnapshot[];
  resolvedScene?: SceneSheetSnapshot | null;
  derivedSceneContext?: {
    source: "scene_sheet" | "storyboard_segment" | "shot_script";
    sceneName: string | null;
    environmentSummary: string;
    spaceRelation?: string | null;
    atmosphere?: string | null;
    props?: string[];
    lighting?: string | null;
  } | null;
};
```

说明：

- 模板每次只为一个 `segment` 的一个关键画面槽位生成 prompt
- `segment` 和 `frameType` 是必需变量
- Prompt 生成前应先解析当前帧真正相关的角色集合，而不是默认把全部角色表塞进模板
- Prompt 生成前也应先解析当前帧真正相关的场景信息，不能只处理人物而忽略环境
- 如果该段属于核心场景，优先把对应已审核 `scene_sheet` 解析为 `resolvedScene`
- 如果没有可复用核心场景，也应从 `storyboard` / `shot_script` 中提炼 `derivedSceneContext`，补齐环境、陈设、光线和空间关系
- 最终 frame prompt 应同时消费“相关人物 + 相关场景”，而不是退化成单纯人物图 prompt

## 输入结构

项目级启动任务建议结构：

```ts
type ImagesGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "images_generate";
  sourceShotScriptId: string;
  shotScript: CurrentShotScript;
  promptTemplateKey: "shot_reference.generate";
};
```

逐帧任务建议结构：

```ts
type FrameImageGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "frame_prompt_generate" | "frame_image_generate";
  batchId: string;
  segmentId: string;
  frameId: string;
  frameType: "start_frame" | "end_frame";
  sourceShotIds: string[];
  segmentSnapshot: ShotScriptSegment;
  resolvedCharacterIds?: string[];
  resolvedSceneSheetId?: string | null;
  derivedSceneContext?: {
    source: "scene_sheet" | "storyboard_segment" | "shot_script";
    sceneName: string | null;
    environmentSummary: string;
  } | null;
  promptTemplateKey: "shot_reference.generate";
};
```

要求：

- 项目级任务必须保存 `shotScript` 快照
- 项目级任务负责创建项目级 `image batch`
- 每个 `segment` 只维护自己的 `startFrame` 与可选 `endFrame`
- 逐关键画面 prompt 任务应先完成“人物解析 + 场景解析”，再渲染最终 prompt
- `scene_sheet` 命中时优先使用它作为正式环境锚点
- 未命中 `scene_sheet` 时，仍需从当前段文本中生成临时场景上下文，不能省略场景
- 后续 prompt / image 任务只更新对应 `segment` 下的单个关键画面槽位

## 输出结构

批次摘要建议结构：

```ts
type CurrentImageBatch = {
  id: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  totalRequiredFrameCount: number;
  updatedAt: string;
};
```

单段参考图记录建议结构：

```ts
type SegmentImageRecord = {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  segmentId: string;
  segmentOrder: number;
  segmentName: string | null;
  segmentSummary: string;
  sourceShotIds: string[];
  frameDependency: "start_frame_only" | "start_and_end_frame";
  status: "generating" | "in_review" | "approved" | "failed";
  startFrame: SegmentFrameRecord;
  endFrame: SegmentFrameRecord | null;
  updatedAt: string;
  approvedAt: string | null;
};
```

要求：

- 每个 `segment` 必须恰好对应一条当前参考图记录
- 每条记录只暴露 `startFrame` 与可选 `endFrame`
- 不再返回 `shots[]` 作为图片阶段主输出结构
- 批次进度以 `approvedSegmentCount / segmentCount` 统计

## 存储与审核点

建议保存：

1. `shot_script` 快照
2. 每个 `segment` 的当前图片记录
3. 每个关键画面槽位的 prompt、图片和版本历史
4. provider 元数据

建议文件路径：

```text
.local-data/projects/<project-id-slug>/
  images/
    current-batch.json
    batches/
      <batch-id>/
        manifest.json
        segments/
          <segment-id>/
            current.json
            start-frame/
              current.png
              current.json
              versions/
            end-frame/
              current.png
              current.json
              versions/
```

审核动作至少包括：

- 查看当前 `segment` 的关键画面
- 按段重生成
- 审核通过当前 `segment`
- 执行“全部通过”，把整批 `images` 收口

只有当所有 `segment` 都审核通过后，项目才允许进入：

- `images -> videos`

## 本阶段暂不处理

- 一个 `segment` 维护多组候选画面包
- 项目级视频生成
- 自动时间轴拼接
- 字幕、音乐、配音
