# 06 Shot Script To Images Guide

## 目标

实现项目在 `shot_script` 之后的正式生成环节：

`已审核镜头脚本 -> segment 参考帧组`

这里的“出图”用于把每一个已审核 `shot_script segment` 落成一组可审核、可替换、可回溯的静态参考资产。每个 `segment` 内部仍然包含多个 `shot`，但当前阶段的审核和批次进度以 `segment` 为收口单位。

当前阶段的目标不是直接生成视频片段，也不是导出成片，而是先产出一批按 `segment` 管理的稳定参考帧资产，供后续 `videos` 阶段消费。

补充说明：

- 本文统一把这个阶段称为 `images`
- 当前阶段采用 `segment-first` 语义
- Prompt 和图片生成仍然发生在 `shot` / `frame` 级
- 但审核与批次进度按 `segment` 收口

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

`一个 shot_script segment = 一组 shots = 一组 start_frame / end_frame = 一个图片审核单元`

也就是说：

- 项目级有一个当前 `image batch`
- `segment` 是当前阶段的正式审核原子单位
- 每个 `segment` 内的单个 `shot` 仍然可能要求：
  - `start_frame_only`
  - `start_and_end_frame`
- 但用户最终按 `segment` 查看、重生成和审核

## Prompt 模板

建议模板键：

`shot_reference.generate`

模板变量建议至少包含：

```ts
type ShotReferencePromptVars = {
  shot: {
    id: string;
    shotCode: string;
    sceneId: string;
    segmentId: string;
    frameDependency: "start_frame_only" | "start_and_end_frame";
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
  frameType: "start_frame" | "end_frame";
  storyboard?: CurrentStoryboard;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  sceneSheets?: SceneSheetSnapshot[];
};
```

说明：

- 模板每次只为一个 `shot` 的一个帧槽位生成 prompt
- `shot` 和 `frameType` 是必需变量
- 如果该段属于核心场景，`sceneSheets` 可用于注入已审核场景参考

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
  shotId: string;
  frameId: string;
  frameType: "start_frame" | "end_frame";
  shotSnapshot: ShotScriptItem;
  promptTemplateKey: "shot_reference.generate";
};
```

要求：

- 项目级任务必须保存 `shotScript` 快照
- 项目级任务负责创建项目级 `image batch`
- 每个 `segment` 维护自己的一组 `shot` 参考帧
- 后续 prompt / image 任务只更新对应 `segment` 下的单个帧槽位

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
  status: "generating" | "in_review" | "approved" | "failed";
  shots: SegmentShotReference[];
  updatedAt: string;
  approvedAt: string | null;
};
```

要求：

- 每个 `segment` 必须恰好对应一条当前参考图记录
- `shots[]` 里按 `shot.frameDependency` 维护 `startFrame` / `endFrame`
- 批次进度以 `approvedSegmentCount / segmentCount` 统计

## 存储与审核点

建议保存：

1. `shot_script` 快照
2. 每个 `segment` 的当前图片记录
3. 每个帧槽位的 prompt、图片和版本历史
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
            shots/
              <shot-id>/
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

- 查看当前 `segment` 的参考帧组
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
