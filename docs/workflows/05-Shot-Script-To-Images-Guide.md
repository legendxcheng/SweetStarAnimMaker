# 05 Shot Script To Images Guide

## 目标

实现项目在 `shot_script` 之后的正式生成环节：

`已审核镜头脚本 -> shot 参考帧组`

这里的“出图”用于把每一个已审核 `shot` 落成一组可审核、可替换、可回溯的静态参考资产。每个 `shot` 的参考帧数量由 `shot.frameDependency` 决定：

- `start_frame_only`
- `start_and_end_frame`

当前阶段的目标不是直接生成视频片段，也不是导出成片，而是先产出一批按 `shot` 管理的稳定参考帧资产，供后续 `videos` 阶段继续消费。

补充说明：

- 本文统一把这个阶段称为 `images`
- 当前阶段采用 `shot-first` 语义
- Prompt 和图片生成仍然是“按帧”执行，但审核与批次进度按 `shot` 收口

## 上游依赖

- 已审核通过的 `shot_script`

辅助上下文仍可读取：

- 已审核通过的 `storyboard`
- 已审核通过的 `master_plot`
- 已审核通过的 `character_sheets`

正式门禁仍应以 `shot_script_approved` 为准。

## 当前阶段的原子规则

当前固定采用：

`一个 shot = 一条参考图记录 = 1 或 2 个帧槽位`

也就是说：

- 当前阶段的正式审核原子单位是 `shot`
- `start_frame_only` 只维护 `startFrame`
- `start_and_end_frame` 同时维护 `startFrame` 与 `endFrame`
- 不再以 `segment` 作为图片审核原子

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

- 模板每次只为一个 `shot` 的一个帧槽位生成 prompt
- `shot` 和 `frameType` 是必需变量
- 角色参考图可以由 provider 单独透传，不必全部塞进 prompt 文本

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
  taskType: "frame_image_generate" | "frame_prompt_generate";
  batchId: string;
  shotId: string;
  frameId: string;
  frameType: "start_frame" | "end_frame";
  shotSnapshot: ShotScriptItem;
  promptTemplateKey: "shot_reference.generate";
};
```

要求：

- 项目级任务必须保存 `shotScript` 快照
- 项目级任务负责为每个 `shot` 创建一条参考图记录
- 帧槽位数量由 `shot.frameDependency` 决定
- 后续 prompt / image 任务只更新该 `shot` 下的单个帧槽位

## 输出结构

批次摘要建议结构：

```ts
type CurrentImageBatch = {
  id: string;
  sourceShotScriptId: string;
  shotCount: number;
  totalRequiredFrameCount: number;
  approvedShotCount: number;
  updatedAt: string;
};
```

单条参考图记录建议结构：

```ts
type ShotReferenceRecord = {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  shotId: string;
  shotCode: string;
  frameDependency: "start_frame_only" | "start_and_end_frame";
  referenceStatus: "pending" | "in_review" | "approved";
  startFrame: ShotReferenceFrame;
  endFrame: ShotReferenceFrame | null;
  updatedAt: string;
};
```

字段意图：

- `shotId` / `shotCode`
  - 直接追溯回上游镜头
- `frameDependency`
  - 决定该镜头需要 1 张还是 2 张参考帧
- `referenceStatus`
  - 代表整个 `shot` 是否进入审核、是否已通过

要求：

- 每个 `shot` 必须恰好对应一条当前参考图记录
- `start_frame_only` 的 `endFrame` 必须为 `null`
- 批次进度以 `approvedShotCount / shotCount` 统计

## 存储建议

```text
<workspace>/
  prompt-templates/
    shot_reference.generate.txt

  .local-data/projects/<project-id>-<slug>/
    images/
      current-batch.json
      batches/
        <batch-id>/
          manifest.json
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

说明：

- 当前目录结构以 `shots/<shot-id>/...` 为主
- `start_frame_only` 时不会生成 `end-frame/current.*`

## 审核点

当前阶段采用“按 shot 审核”：

- 查看当前 `shot` 的参考帧组
- 逐帧编辑 prompt 或重新出图
- 审核通过当前 `shot`
- 执行“全部通过”，把整批 `images` 收口

只有当所有 `shot` 的必需帧都通过审核后，项目才允许进入：

- `images -> videos`

## 本阶段暂不处理

- 一个 `shot` 维护多组候选参考帧
- 手工上传替代图片
- 项目级视频生成
- 自动时间轴拼接
- 字幕、音乐、配音
