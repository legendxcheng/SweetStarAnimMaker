# 08 Videos To Final Cut Guide

## 目标

实现项目在 `videos` 之后的正式导出环节：

`已审核视频片段 -> 成片/导出`

这里的“成片/导出”用于把当前视频批次下已经审核通过的 `segment` 视频片段按顺序拼接成最终成片资产，供下载、播放或后续分发使用。

当前阶段的目标不是扩展新的项目状态机，而是提供最小可用的 final cut 导出能力。

## 上游依赖

这个阶段的正式上游依赖是：

- 已审核通过的 `videos`

### 必需输入

- `sourceVideoBatchId`
- 当前视频批次下全部已审核 `segment` 视频记录

### 当前阶段的原子规则

当前固定采用：

`一个 final_cut = 当前视频批次下全部已审核 segment 的顺序拼接结果`

也就是说：

- `final_cut` 不是新的长期项目阶段状态
- 它是一个导出资产
- 是否可导出由当前视频批次状态和视频文件完整性决定

## AI 提供方

- `导出/渲染器`

当前通过 ffmpeg manifest 和 renderer 生成最终导出资产，不需要文字、图片或视频模型再次参与。

## Prompt 模板

当前阶段没有 AI prompt 模板要求。

但至少要保存：

- manifest 输入
- 导出参数
- 渲染结果元数据

## 输入结构

建议任务结构：

```ts
type FinalCutGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "final_cut_generate";
  sourceVideoBatchId: string;
  segments: Array<{
    segmentId: string;
    order: number;
    videoAssetPath: string;
  }>;
};
```

## 输出结构

建议结构：

```ts
type CurrentFinalCut = {
  id: string;
  sourceVideoBatchId: string;
  videoAssetPath: string;
  manifestAssetPath: string;
  durationSec: number | null;
  updatedAt: string;
};
```

## 存储与审核点

建议保存：

1. 当前视频批次快照
2. 参与拼接的 segment 列表
3. ffmpeg manifest
4. 导出视频文件
5. 导出元数据

建议文件路径：

```text
.local-data/projects/<project-id-slug>/
  final-cut/
    current.json
    current.mp4
    manifests/
      <task-id>.txt
    versions/
```

当前阶段不要求单独的项目级审核状态。

是否允许启动 `final_cut_generate` 的门禁是：

- 当前视频批次下所有 segment 都已 `approved`
- 每个 segment 都存在可读的视频资产

## 本阶段暂不处理

- 非线性编辑时间轴
- 精细转场
- 片头片尾模板系统
- 字幕、配乐、旁白混音
- 新增 `final_cut_approved` 项目状态
