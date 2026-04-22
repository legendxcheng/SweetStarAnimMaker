# 07 Images To Videos Guide

## 目标

实现项目在 `images` 之后的正式生成环节：

`已审核 segment 参考帧组 -> segment 视频片段`

这里的“视频片段”用于把每一个已审核 `segment` 的参考帧组落成一个可审核、可重生成、可回溯的视频资产：

- `segment_video`

当前阶段的目标不是直接输出整部成片，也不是做项目级时间轴拼接，而是先产出一批按 `segment` 管理的稳定视频片段。

补充说明：

- 本文统一把这个阶段称为 `videos`
- 当前阶段采用 `segment-first` 语义
- `videos_generate` 只初始化批次和 prompt 准备，不直接调用 Seedance
- `segment_video_generate` 才是真正调用视频 provider 的任务

## 上游依赖

- 已审核通过的 `images`

辅助上下文仍可读取：

- 已审核通过的 `shot_script`
- 已审核通过的 `storyboard`
- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`
- 已审核通过的 `scene_sheets`

正式门禁仍应以 `images_approved` 为准。

## 当前阶段的原子规则

当前固定采用：

`一个 segment = N shots = 一组参考图/音频 = 一条当前视频记录`

也就是说：

- 当前阶段的生成、重生成、审核原子单位是 `segment`
- 每个 `segment` 只维护一条当前视频记录
- 参考素材按“有业务语义的参考包”理解，而不是单纯一堆图片

## Prompt 模板

建议模板键：

- `segment_video.prompt.generate`

模板变量建议至少包含：

```ts
type SegmentVideoPromptVars = {
  segment: ShotScriptSegment;
  storyboard?: CurrentStoryboard;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  sceneSheets?: SceneSheetSnapshot[];
  referenceImages: Array<{
    kind: "character_sheet" | "scene_sheet" | "start_frame" | "end_frame" | "extra";
    imageAssetPath: string;
  }>;
  referenceAudios?: Array<{
    assetPath: string;
  }>;
};
```

说明：

- 正式参考素材优先顺序应是：
  - `character_sheet`
  - `scene_sheet`
  - `start_frame`
  - `end_frame`
- 如果该段没有可复用核心场景，`scene_sheet` 可以为空
- 当前 provider 仍把这些素材统一通过 `referenceImages` 发送，但业务语义必须区分

## 输入结构

项目级启动任务建议结构：

```ts
type VideosGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "videos_generate";
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  imageBatch: CurrentImageBatch;
  shotScript: CurrentShotScript;
};
```

prompt 生成任务建议结构：

```ts
type SegmentVideoPromptGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "segment_video_prompt_generate";
  batchId: string;
  segmentId: string;
};
```

视频生成任务建议结构：

```ts
type SegmentVideoGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "segment_video_generate";
  batchId: string;
  segmentId: string;
  promptTextCurrent: string;
  referenceImages: VideoReferenceImage[];
  referenceAudios?: VideoReferenceAudio[];
};
```

## 输出结构

批次摘要建议结构：

```ts
type CurrentVideoBatchSummary = {
  id: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
};
```

单条视频记录建议结构：

```ts
type SegmentVideoRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  segmentOrder: number;
  status: "generating" | "in_review" | "approved" | "failed";
  promptTextSeed: string;
  promptTextCurrent: string;
  referenceImages: VideoReferenceImage[];
  referenceAudios: VideoReferenceAudio[];
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
};
```

## 存储与审核点

建议保存：

1. `imageBatch` 快照
2. `shotScript` 快照
3. prompt 生成结果
4. 当前可编辑 prompt
5. 当前参考图和参考音频列表
6. 当前视频和版本历史
7. provider 元数据

建议文件路径：

```text
.local-data/projects/<project-id-slug>/
  videos/
    current-batch.json
    batches/
      <batch-id>/
        manifest.json
        segments/
          <segment-id>/
            current.mp4
            current.json
            thumbnail.webp
            versions/
```

审核动作至少包括：

- 查看当前 `segment` 的视频片段
- 修改当前视频 prompt
- 编辑参考图 / 参考音频
- 重新生成 prompt
- 手动触发当前 `segment` 的视频生成
- 审核通过当前 `segment`
- 执行“全部通过”，把整批 `videos` 收口

只有当所有 `segment` 的当前视频都被审核通过后，项目才允许进入：

- `videos -> final_cut`

## 本阶段暂不处理

- 项目级时间轴拼接
- 多个 segment 视频的自动串联
- 字幕、音乐、配音
- 手工上传替代视频
