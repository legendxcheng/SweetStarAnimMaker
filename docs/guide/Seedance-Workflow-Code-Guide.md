# Seedance Workflow 代码维护指南

## 目的

这份文档面向后续开发者，说明当前仓库里 Seedance 视频工作流的真实代码路径、状态流转、存储落点，以及扩展时应该改哪一层。

本文描述的是 `2026-04-20` 当前仓库实现，不是理想设计稿。

## 一句话总结

当前 Seedance 工作流不是“直接点一下就调 Provider”，而是一个分层流程：

1. API 创建一个整批 `videos_generate` 任务
2. worker 为每个 `segment` 建立视频记录，并异步生成视频 prompt
3. Studio 允许人工编辑 prompt、补参考音频、重新生成 prompt
4. 用户对某个 segment 点“生成视频”后，再创建 `segment_video_generate` 任务
5. worker 调用 Seedance provider，下载生成结果，写回本地存储和 SQLite
6. 人工审核通过后，项目进入 `videos_approved`，再允许生成 final cut

## 建议阅读顺序

如果你第一次接手这块，建议按这个顺序读：

- `apps/api/src/http/register-video-routes.ts`
- `packages/core/src/use-cases/create-videos-generate-task.ts`
- `packages/core/src/use-cases/process-videos-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/src/use-cases/regenerate-video-segment.ts`
- `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- `apps/worker/src/bootstrap/video-provider-config.ts`
- `packages/services/src/providers/seedance-video-provider.ts`
- `apps/studio/src/components/video-phase-panel.tsx`

## 架构分层

当前链路大致分成 5 层：

- `apps/api`
  - 暴露 HTTP 路由，只负责 parse request 并调用 use case
- `packages/core`
  - 真正的业务编排层，负责任务创建、状态流转、仓储读写、错误恢复
- `apps/worker`
  - 消费队列任务，把 `packages/core` use case 跑起来
- `packages/services`
  - 外部能力适配层，包括 Seedance provider、SQLite repository、本地文件存储
- `apps/studio`
  - 人工审核和编辑界面

理解这条边界很重要：

- 改业务规则，优先改 `packages/core`
- 改 HTTP 契约，改 `apps/api` + `packages/shared`
- 改供应商请求格式，改 `packages/services`
- 改交互体验，改 `apps/studio`

## 主流程

### 1. 创建整批视频任务

入口：

- API 路由：`POST /projects/:projectId/videos/generate`
- 注册位置：`apps/api/src/http/register-video-routes.ts`
- use case：`packages/core/src/use-cases/create-videos-generate-task.ts`

这个阶段做的事：

- 要求项目状态必须是 `images_approved`
- 要求 `currentImageBatchId` 和已批准的 shot script 都存在
- 创建一个 `videos_generate` 任务
- 把项目状态先切到 `videos_generating`

这里还不会直接调用 Seedance。它只是把“视频阶段初始化任务”放进队列。

### 2. worker 初始化 video batch 和 segment 记录

入口：

- worker processor：`apps/worker/src/index.ts`
- use case：`packages/core/src/use-cases/process-videos-generate-task.ts`

这个阶段做的事：

- 读取 `videos_generate` 任务输入
- 创建 `video_batches` 记录
- 遍历 shot script 的每个 `segment`
- 为每个 `segment` 创建一条 `segment_videos` 记录
- 自动从已批准的 shot image 中抽取参考图
- 为每个 `segment` 再创建一个 `segment_video_prompt_generate` 子任务

核心辅助函数：

- `packages/core/src/use-cases/build-segment-video-references.ts`

它的当前行为是：

- 遍历 segment 下所有 shots
- 优先按 shot 顺序收集 `start_frame`
- 如果存在且不同，再收集 `end_frame`
- 按路径去重
- 默认最多保留 `6` 张参考图

这就是“当前 segment 的帧参考图集合”来源。

从当前产品语义上，建议把这些默认参考图理解成一个 segment 参考包的自动起点，而不是最终完整语义：

- `角色设定参考图` 应该视为必选素材
- `首帧` 应该视为必选素材
- `尾帧` 只在需要稳定结束状态时作为可选素材
- `场景设定图` 只在需要稳定环境空间和氛围时作为可选素材

当前代码里的 `buildSegmentVideoReferences(...)` 不再用字符串包含、尾号或别名去判断人物/场景相关性；人物和场景必须由 video prompt LLM 在 prompt plan 里返回选择结果：

- prompt provider 输入会携带已审核的 `characterCandidates` / `sceneCandidates`，每个候选都包含 `id`、名称、当前设定 prompt 和图片路径。
- LLM 必须根据 `segment + shots` 的语义返回 `selectedCharacterIds` 和 `selectedSceneId`。
- `selectedCharacterIds` / `selectedSceneId` 只能使用候选列表中的 id，不能编造，也不能选择无关人物/无关场景。
- `with_frame_refs` / `auto`：按 LLM 选择的场景图、人物图，再追加该 segment 下 shot images 的首尾帧。
- `without_frame_refs`：只按 LLM 选择的场景图、人物图组织引用，不追加首尾帧。

因此 Studio 里的“带帧参考图”不是“只有帧参考图”，而是“角色/场景参考图 + 帧参考图”。

`重新生成单个片段提示词` 和 `重新生成所有片段提示词` 会重新调用 LLM 做人物/场景选择，并用返回的 id 重建 `referenceImages` 写回当前 segment；它们不会继续沿用旧批次里已经过时的首尾帧列表。

### 3. worker 生成 segment prompt

入口：

- use case：`packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`

这个阶段做的事：

- 读取 segment 当前记录
- 把 `segment + shots + frame referenceImages + referenceAudios + characterCandidates + sceneCandidates` 转成 prompt provider 输入
- 调用 `videoPromptProvider.generateVideoPrompt(...)`
- 读取 LLM 返回的 `selectedCharacterIds` / `selectedSceneId`
- 根据 LLM 选择结果和项目视频参考策略重建 `referenceImages`
- 把返回的 `finalPrompt` 写入：
  - `promptTextSeed`
  - `promptTextCurrent`
- 把 segment 状态切到 `in_review`
- 把规划结果写入 `prompt.plan.json`
- 根据所有 segment 状态推导项目状态

Prompt 输入构造器在：

- `packages/core/src/use-cases/build-video-prompt-provider-input.ts`

Prompt provider 适配器相关文件：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`
- `packages/services/src/providers/grok-video-prompt-provider.ts`
- `packages/services/src/providers/video-prompt-provider-with-grok-fallback.ts`
- `packages/services/src/providers/video-prompt-plan.ts`

当前 fallback 规则很简单：

- 主 provider 抛出 `PROHIBITED_CONTENT` 或近似错误时，才 fallback 到 Grok

### 4. 人工编辑 segment 配置

入口：

- Studio 面板：`apps/studio/src/components/video-phase-panel.tsx`
- Segment 卡片：`apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- API client：`apps/studio/src/services/api-client/videos.ts`
- 路由：`apps/api/src/http/register-video-routes.ts`

当前 UI 支持这些动作：

- 保存当前 segment 配置
- 上传参考音频
- 重新生成单个 prompt
- 重新生成全部 prompt
- 生成当前 segment 视频
- 通过当前 segment
- 全部 segment 一次性通过
- 所有 segment 通过后生成 final cut

保存配置的 use case：

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`
- `packages/core/src/use-cases/regenerate-video-prompt.ts`
- `packages/core/src/use-cases/regenerate-all-video-prompts.ts`

这些接口有一个统一规则：

- 如果 segment 之前已经是 `approved`
- 只要你改了 prompt / referenceImages / referenceAudios
- 它会被打回 `in_review`
- `approvedAt` 会被清空

这是当前代码里非常重要的审核失效规则。

### 5. 创建单个 segment 视频生成任务

入口：

- API 路由：`POST /projects/:projectId/videos/segments/:videoId/generate`
- 兼容别名：`POST /projects/:projectId/videos/segments/:videoId/regenerate`
- use case：`packages/core/src/use-cases/regenerate-video-segment.ts`

这个阶段做的事：

- 要求项目状态属于：
  - `images_approved`
  - `videos_generating`
  - `videos_in_review`
  - `videos_approved`
- 读取当前 video segment
- 重新从 shot script / image batch 取 segment 与 representative shot
- 把当前 segment 状态切到 `generating`
- 创建 `segment_video_generate` 任务并入队
- 把项目状态切回 `videos_generating`

注意：

- 这里的代表 shot 仍然存在
- 但当前真正送给 Seedance 的不只是这个 shot 的首尾帧，而是 segment 级 referenceImages / referenceAudios

当前推荐的业务理解是：

- `referenceImages` 至少应覆盖 `角色设定参考图 + 首帧`
- 如果 segment 对结束状态敏感，再补 `尾帧`
- 如果 segment 对环境一致性敏感，再补 `场景设定图`

不要把“segment-first”误解成“只要塞几张首尾帧就够了”。当前更合理的目标是把 segment 参考素材组织成一组有清晰用途的参考包。

### 6. worker 调用 Seedance 生成视频

入口：

- use case：`packages/core/src/use-cases/process-segment-video-generate-task.ts`

这个阶段做的事：

- 读取当前 segment
- 把 `referenceImages` / `referenceAudios` 的相对路径解析成项目内真实路径
- 把当前 prompt 和变量快照写入任务目录
- 调用 `videoProvider.generateSegmentVideo(...)`
- 把 provider 原始响应写入任务目录
- 下载视频和缩略图到项目目录
- 写 `current.mp4`、`current.json`、版本文件
- 回写 segment 的 `provider`、`model`、`videoAssetPath`、`thumbnailAssetPath`
- 把 segment 状态切回 `in_review`
- 根据所有 segment 状态重新计算项目状态

这个 use case 是“业务编排层”的最后一站。真正对外请求 Seedance 的代码不在这里，而在 provider。

## Seedance Provider 层

### worker 如何选 Provider

入口：

- `apps/worker/src/bootstrap/video-provider-config.ts`

当前实现中，这个工厂直接返回：

- `createSeedanceStageVideoProvider(...)`

也就是说，当前 worker 视频生成默认已经是 Seedance stage adapter。

### 当前实际使用的环境变量

worker 代码读的是：

- `SEEDANCE_API_BASE_URL`
- `SEEDANCE_API_KEY`
- `SEEDANCE_MODEL`
- `SEEDANCE_DURATION_SEC`
- `SEEDANCE_ASPECT_RATIO`

其中 `SEEDANCE_ASPECT_RATIO` 未配置时，worker 会默认传 `16:9`。当前短剧成片目标是横屏，所以不要让生产请求落回 Seedance 的 `adaptive` 比例；如果确实要做竖屏或方屏，应显式配置该环境变量，例如 `9:16` 或 `1:1`。

对应文件：

- `apps/worker/src/bootstrap/video-provider-config.ts`

### Stage adapter 做了什么

文件：

- `packages/services/src/providers/seedance-video-provider.ts`

`createSeedanceStageVideoProvider(...)` 会把统一 `VideoProvider` 接口转成 Seedance 请求，当前规则是：

- `referenceImages` 优先使用 segment 记录里的整组参考图
- 只有在 `referenceImages` 为空时，才 fallback 到 `startFramePath`
- segment 多图参考策略必须把角色图、场景图和帧参考图全部发进 Seedance payload
- Seedance 请求中的第一段文本会自动追加 `参考图别名说明`，按 `图片1`、`图片2` 等稳定编号说明每张图的业务含义
- `referenceAudios` 会按 `order` 排序后一起发送
- `durationSec` 来自 segment 或 provider 默认值
- `aspectRatio` 映射到 Seedance `ratio`；没有 segment 级比例时使用 provider 配置，worker 默认是 `16:9`

这意味着当前系统的真实语义是：

- segment 级多图参考视频生成
- 可选叠加 segment 级参考音频

而不是：

- 严格的首帧/尾帧控制模式

当前建议对上层业务语义做如下约束：

- `角色设定参考图` 必选
- `首帧` 必选
- `尾帧` 可选
- `场景设定图` 可选

但要注意，Seedance 的图片角色字段只表达外部协议角色，不足以承载完整业务分类。所以如果你在上层补充了这些素材，仍然应该：

- 在 `referenceImages` 里按稳定顺序组织它们
- 在 prompt / payload 文本中显式说明各类图片的用途；当前 provider 会自动追加 `参考图别名说明`
- 在 UI 和审核语义中保留这些分类信息，而不是把它们当成无差别图片堆

### Seedance 请求体如何构造

同文件内 `createSeedanceVideoProvider(...)` 负责：

- 组装 `model`
- 组装 `content`
- 组装 `duration`
- 可选附带 `resolution` / `ratio` / `generate_audio` / `return_last_frame`

对当前 worker 主链路来说，`ratio` 实际不应视为可省略字段：`apps/worker/src/bootstrap/video-provider-config.ts` 会把未配置的 `SEEDANCE_ASPECT_RATIO` 归一成 `16:9`，再传入 Seedance stage adapter。只有 smoke 脚本或直接调用底层 provider 时，才可能因为未传 `ratio` 而使用 Seedance 服务端默认比例。

`content` 的当前构造规则：

- prompt -> `{ type: "text" }`
- 参考图 -> `{ type: "image_url", role: "reference_image" }`
- segment 参考图会按顺序生成 `图片N = <label>` 的别名说明，并追加到 prompt 文本
- 参考视频 -> `{ type: "video_url", role: "reference_video" }`
- 参考音频 -> `{ type: "audio_url", role: "reference_audio" }`
- 可选 `draft_task`

### 本地素材如何处理

同文件里的 `resolveSeedanceAsset(...)` 当前规则：

- 远程 URL / `asset://` / `data:` 原样透传
- 本地图片 -> 转成 `data:image/...;base64,...`
- 本地音频 -> 转成 `data:audio/...;base64,...`
- 本地视频 -> 先上传到 `p.sda1.dev`，再把公网 URL 发给 Seedance

这也是为什么 `process-segment-video-generate-task.ts` 只需要把相对路径解析成绝对路径即可。

## 状态模型

### Segment 状态

定义位置：

- `packages/shared/src/schemas/video-api.ts`

当前 segment 状态只有 4 个：

- `generating`
- `in_review`
- `approved`
- `failed`

### 项目视频状态

推导函数：

- `packages/core/src/use-cases/derive-project-video-status.ts`

当前规则非常直接：

- 任一 segment 是 `generating` -> 项目是 `videos_generating`
- 全部 segment 是 `approved` -> 项目是 `videos_approved`
- 其他情况 -> `videos_in_review`

### 审核规则

单个审核：

- `packages/core/src/use-cases/approve-video-segment.ts`

要求：

- `segment.status === "in_review"`
- `segment.videoAssetPath !== null`

全部审核：

- `packages/core/src/use-cases/approve-all-video-segments.ts`

要求：

- 每个 segment 都已经 `approved`
- 或者处于 `in_review` 且已经有 `videoAssetPath`

## 存储与持久化

### SQLite

仓储：

- `packages/services/src/video-repository/sqlite-video-repository.ts`

当前视频数据主要落在两张表：

- `video_batches`
- `segment_videos`

`segment_videos` 里已经包含当前维护最常用的字段：

- `prompt_text_seed`
- `prompt_text_current`
- `reference_images_json`
- `reference_audios_json`
- `video_asset_path`
- `thumbnail_asset_path`
- `provider`
- `model`
- `approved_at`
- `source_task_id`

### 本地文件

存储实现：

- `packages/services/src/storage/video-storage.ts`
- `packages/core/src/domain/video.ts`

一个 segment 当前会落这些文件：

- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/current.mp4`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/current.json`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/thumbnail.webp`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/prompt.plan.json`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/versions/<taskId>.mp4`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/versions/<taskId>.json`
- `videos/batches/<batchId>/segments/<sceneId>__<segmentId>/references/audios/...`

任务目录还会补这些调试文件：

- `prompt-snapshot.json`
- `raw-response.txt`

## Studio 行为

主要 UI 代码：

- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`

几个值得注意的前端行为：

- `project.status === "videos_generating"` 时会自动轮询 `listVideos`
- 编辑中的 prompt draft 只存在前端 state，保存后才写回后端
- “生成余下视频片段”当前是前端筛选未完成 segment 后循环逐个调用 `generateVideoSegment(...)`
- 这里的“未完成”指 `status !== "approved"`、`status !== "generating"` 且没有 `videoAssetPath`；不是“未定稿/待审核”
- segment 处于 `generating` 时，卡片显示 loading，而不是旧视频

## 列表读取时的补偿逻辑

文件：

- `packages/core/src/use-cases/list-videos.ts`
- `packages/core/src/use-cases/get-video.ts`
- `packages/core/src/use-cases/repair-segment-video-prompts.ts`

当前代码有一个很实用的兜底：

- 如果 segment 的 `promptTextSeed` / `promptTextCurrent` 丢了
- `listVideos` 和 `getVideo` 会尝试按当前 shot script 和 reference 数据重新补 prompt

这说明：

- prompt 数据虽然是 segment 记录的一部分
- 但系统默认它是“可以从其他 canonical 数据再推导回来”的

后续改造时不要轻易删除这条补偿逻辑，除非你已经把 prompt 作为完全权威的唯一来源。

## 最常见的改动入口

### 1. 想改 segment 默认参考图策略

改这里：

- `packages/core/src/use-cases/build-segment-video-references.ts`

适用场景：

- 参考图上限变更
- 只取 start frame
- 优先保留首尾镜头
- 去重策略调整

不要在这里新增“按角色名/场景名字符串匹配”的相关性判断。人物/场景相关性属于 prompt planning，由 `packages/services/src/providers/video-prompt-plan.ts` 里的 LLM 指令和返回 schema 控制。

### 2. 想改 prompt 结构或 prompt provider 输入

改这里：

- `packages/core/src/use-cases/build-video-prompt-provider-input.ts`
- `packages/services/src/providers/video-prompt-plan.ts`
- `packages/services/src/providers/gemini-video-prompt-provider.ts`
- `packages/services/src/providers/grok-video-prompt-provider.ts`

### 3. 想改 Seedance 的请求字段或素材映射

改这里：

- `packages/services/src/providers/seedance-video-provider.ts`
- `packages/services/src/providers/seedance-video-provider.types.ts`

适用场景：

- 新增 provider 选项
- 改 `content` 数组结构
- 引入更严格的首尾帧模式
- 支持新的素材类型

### 4. 想改审核流或编辑后失效规则

改这里：

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`
- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/approve-all-video-segments.ts`
- `packages/core/src/use-cases/derive-project-video-status.ts`

### 5. 想改 UI 上的操作按钮或交互

改这里：

- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- `apps/studio/src/services/api-client/videos.ts`
- `apps/api/src/http/register-video-routes.ts`

## 当前实现里的几个坑

### 1. 环境变量命名现在并不统一

worker 配置读取的是：

- `SEEDANCE_API_KEY`
- `SEEDANCE_MODEL`

但 smoke 脚本 `tooling/scripts/test-seedance-video-provider.ts` 读取的是：

- `SEEDANCE_API_TOKEN`
- `SEEDANCE_VIDEO_MODEL`

后续开发时不要假设这两套名字已经统一。

### 2. “segment workflow” 里还保留了一些 legacy shot 字段

比如：

- `shotId`
- `shotCode`
- `shotOrder`
- `frameDependency`

这些字段现在还在 `SegmentVideoRecordEntity` 里保留，主要是为了兼容老逻辑和代表 shot。

如果你想做纯 segment-first 重构，这些字段是重点清理对象。

### 3. 当前 Seedance adapter 并没有真正消费 end frame 语义

虽然上游 reference 可能含有 start/end frame 来源，但 stage adapter 当前只把它们当“普通参考图集合”处理。

这也是为什么当前更合理的产品规则不是“强制所有 segment 都提供首尾帧”，而是：

- `角色设定参考图` 必选
- `首帧` 必选
- `尾帧` 可选
- `场景设定图` 可选

如果你要接入真正的首尾帧控制模式，不要在当前 adapter 上继续隐式复用，最好显式拆模式。

### 4. `generateAudio` 和 `returnLastFrame` 不是 segment 级配置

当前它们来自 provider options，而不是 segment record。

如果后续产品要求“每个 segment 自己决定是否开音频或回尾帧”，需要扩 schema、API、repo、UI、provider 全链路。

## 推荐测试入口

代码改完后，至少跑与改动层对应的测试。

常用命令：

```bash
corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task
corepack pnpm --filter @sweet-star/core test -- process-segment-video-prompt-generate-task
corepack pnpm --filter @sweet-star/services test -- seedance-video-provider
corepack pnpm --filter @sweet-star/worker test -- video-worker.integration.test.ts
corepack pnpm --filter @sweet-star/api test -- register-video-routes.test.ts
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

需要做真实 provider 联调时：

```bash
corepack pnpm smoke:seedance-video --image .\char.png --prompt "..."
```

## 你后续开发时可以怎么判断该改哪层

按这个问题去分流最稳：

- “这是业务规则变化吗？” -> `packages/core`
- “这是 HTTP/前后端契约变化吗？” -> `apps/api` + `packages/shared` + `apps/studio`
- “这是 Seedance 请求协议变化吗？” -> `packages/services`
- “这是数据落盘/版本保留变化吗？” -> `packages/services/src/storage` + `packages/core/src/domain/video.ts`
- “这是按钮和交互变化吗？” -> `apps/studio`

## 结论

当前 Seedance workflow 已经是一个标准的 segment-first 人审视频流，而不是单次 provider demo：

- 批量初始化发生在 `videos_generate`
- prompt 生成与视频生成是两个独立 worker 阶段
- segment 配置可以人工编辑并带审核失效机制
- Seedance 只负责真正的视频生成，不负责整个业务编排

后续如果你要继续开发，最重要的是先判断自己改的是：

- segment 编排层
- prompt 规划层
- provider 适配层
- UI 审核层

不要在 provider 里偷塞业务状态逻辑，也不要在 UI 里偷做状态真相。
