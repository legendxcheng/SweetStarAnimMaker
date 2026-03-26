# 06 Images To Videos Guide

## 目标

实现项目在 `images` 之后的正式生成环节：

`已审核 shot 参考帧组 -> shot 视频片段`

这里的“视频片段”用于把每一个已审核 `shot` 的参考帧组落成一个可审核、可重生成、可回溯的视频资产：

- `shot_video`

当前阶段的目标不是直接输出整部成片，也不是做项目级时间轴拼接，而是先产出一批按 `shot` 管理的稳定视频片段。

补充说明：

- 本文统一把这个阶段称为 `videos`
- 当前阶段采用 `shot-first` 语义
- `shot.frameDependency` 继续决定视频生成时需要单帧还是首尾双帧参考

## 上游依赖

- 已审核通过的 `images`

辅助上下文仍可读取：

- 已审核通过的 `shot_script`
- 已审核通过的 `storyboard`
- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`

正式门禁仍应以 `images_approved` 为准。

## 当前阶段的原子规则

当前固定采用：

`一个 shot = 一条当前视频记录`

也就是说：

- 当前阶段的生成、重生成、审核原子单位是 `shot`
- 每个 `shot` 只维护一条当前视频记录
- `start_frame_only` 仅使用起始帧参考
- `start_and_end_frame` 同时使用起始帧与结束帧参考

## Prompt 模板

建议模板键：

`shot_video.generate`

模板变量建议至少包含：

```ts
type ShotVideoPromptVars = {
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
  startFrame: {
    imageAssetPath: string;
    width?: number | null;
    height?: number | null;
  };
  endFrame: {
    imageAssetPath: string;
    width?: number | null;
    height?: number | null;
  } | null;
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

- `shot` 与 `startFrame` 是必需变量
- `endFrame` 只有在 `frameDependency === "start_and_end_frame"` 时才存在
- provider 应根据依赖模式决定发单帧还是双帧请求

## 输入结构

项目级启动任务建议结构：

```ts
type VideosGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "videos_generate";
  sourceImageBatchId: string;
  imageBatch: CurrentImageBatch;
  sourceShotScriptId: string;
  shotScript: CurrentShotScript;
  promptTemplateKey: "shot_video.generate";
};
```

逐镜头视频任务建议结构：

```ts
type ShotVideoGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "segment_video_generate";
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  frameDependency: "start_frame_only" | "start_and_end_frame";
  startFrame: ShotReferenceFrame;
  endFrame: ShotReferenceFrame | null;
  shotSnapshot: ShotScriptItem;
  promptTemplateKey: "shot_video.generate";
};
```

要求：

- 项目级任务必须保存 `imageBatch` 和 `shotScript` 快照
- 项目级任务负责为每个 `shot` 创建一条当前视频记录
- 单镜头任务只更新该 `shot` 的当前视频

## 输出结构

批次摘要建议结构：

```ts
type CurrentVideoBatchSummary = {
  id: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotCount: number;
  approvedShotCount: number;
  updatedAt: string;
};
```

单条视频记录建议结构：

```ts
type ShotVideoRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  sceneId: string;
  frameDependency: "start_frame_only" | "start_and_end_frame";
  status: "generating" | "in_review" | "approved" | "failed";
  promptTextSeed: string;
  promptTextCurrent: string;
  promptUpdatedAt: string;
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
};
```

字段意图：

- `shotId` / `shotCode`
  - 保证能直接追溯回镜头脚本
- `frameDependency`
  - 说明当前视频是单帧参考还是双帧参考
- `shotCount` / `approvedShotCount`
  - 项目门禁与 Studio 批次进度的正式统计口径

## 存储建议

```text
<workspace>/
  prompt-templates/
    shot_video.generate.txt

  .local-data/projects/<project-id>-<slug>/
    videos/
      current-batch.json
      batches/
        <batch-id>/
          manifest.json
          shots/
            <shot-id>/
              current.mp4
              current.json
              thumbnail.webp
              versions/
```

说明：

- 当前目录结构以 `shots/<shot-id>/current.*` 为主
- 缩略图与视频元数据都跟随 shot 记录保存

## 审核点

当前阶段采用“按 shot 审核”：

- 查看当前 `shot` 的视频片段
- 重生成当前 `shot` 的视频片段
- 审核通过当前 `shot`
- 执行“全部通过”，把整批 `videos` 收口

只有当所有 `shot` 的当前视频都被审核通过后，项目才允许进入：

- `videos -> final_cut`

## 本阶段暂不处理

- 项目级时间轴拼接
- 多个 shot 视频的自动串联
- 字幕、音乐、配音
- 片头片尾
- 手工上传替代视频
- 导出最终整片
