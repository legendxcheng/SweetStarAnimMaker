# Seedance Provider 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中使用新的 Seedance Provider，并明确它和项目里现有 VectorEngine 配置的边界。

本文重点覆盖：

- 代码入口在哪里
- 环境变量应该怎么配
- 哪些参数是固定配置，哪些参数必须在运行时决定
- 如何用命令行做最小真实联调
- 当前已经验证过什么

本文内容基于当前仓库实现和 `2026-04-18` 的实际联调结果整理。

## 当前接入范围

当前仓库中的 Seedance 接入分成两层：

- 底层 Provider：`packages/services/src/providers/seedance-video-provider.ts`
- 命令行联调入口：`tooling/scripts/test-seedance-video-provider.ts`

同时，worker 配置层已经支持通过 `VIDEO_PROVIDER=seedance` 选择该 Provider：

- `apps/worker/src/bootstrap/video-provider-config.ts`

## 最重要的配置边界

Seedance 不再复用项目里的通用 VectorEngine 视频配置。

现在的边界是：

- 文字、图片、Kling、Sora 等现有链路：继续使用 `VECTORENGINE_BASE_URL` 和 `VECTORENGINE_API_TOKEN`
- Seedance：单独使用 `SEEDANCE_API_BASE_URL` 和 `SEEDANCE_API_TOKEN`

也就是说，不能把官方方舟地址直接写回 `VECTORENGINE_BASE_URL`，否则会影响项目里其他依赖 VectorEngine 的能力。

## 环境变量

根目录 `.env` 最少需要：

```env
VIDEO_PROVIDER=seedance

VECTORENGINE_BASE_URL=https://api.vectorengine.ai
VECTORENGINE_API_TOKEN=your-vectorengine-token

SEEDANCE_API_BASE_URL=https://ark.cn-beijing.volces.com
SEEDANCE_API_TOKEN=your-ark-api-key
SEEDANCE_VIDEO_MODEL=doubao-seedance-2-0-260128
```

说明：

- `SEEDANCE_API_BASE_URL` 当前应使用方舟官方地址 `https://ark.cn-beijing.volces.com`
- `SEEDANCE_API_TOKEN` 必须是方舟官方 API Key
- `SEEDANCE_VIDEO_MODEL` 用于指定默认模型
- 代码会自动拼接 `/api/v3/contents/generations/tasks`，因此 `SEEDANCE_API_BASE_URL` 只填域名根即可

## 哪些参数不能放到环境变量

以下参数不应该放到 `.env` 中：

- 视频时长
- 是否生成音频
- 是否返回尾帧

原因是它们属于单次任务的运行时决策，而不是全局固定配置。

当前实现里，这些值都在调用时决定：

- 正式任务流里，由运行时输入决定
- smoke 脚本里，由命令行参数决定

例如：

- `--duration 4`
- `--generate-audio` / `--no-generate-audio`
- `--return-last-frame` / `--no-return-last-frame`

## 接口定位

当前接入的官方接口是：

```text
POST /api/v3/contents/generations/tasks
GET  /api/v3/contents/generations/tasks/{task-id}
```

认证方式是：

```text
Authorization: Bearer <SEEDANCE_API_TOKEN>
```

这部分走的是火山方舟官方 Seedance API，不经过 `api.vectorengine.ai`。

## 当前支持的输入素材

底层 Seedance Provider 当前支持以下输入：

- 文本提示词
- 参考图片
- 参考视频
- 参考音频
- draft task id

对应方法：

- `submitVideoGenerationTask()`
- `getVideoGenerationTask()`
- `waitForVideoGenerationTask()`

## 本地素材处理方式

当前本地素材的处理逻辑是：

- 本地图片：转成 `data:image/...;base64,...`
- 本地音频：转成 `data:audio/...;base64,...`
- 本地视频：先上传到 `p.sda1.dev`，再把返回的公网 URL 发给 Seedance

这意味着：

- 测试多图参考最方便，直接传本地图片即可
- 如果要测参考视频，本地视频也可以直接传，但会先走一次上传

## 与当前项目视频任务流的关系

当前项目的视频任务流仍然是围绕 `generateSegmentVideo(...)` 这个统一口子工作的。

为了兼容现有口子，Seedance stage adapter 当前做了一个收敛处理：

- `startFramePath` 会被当作普通 `reference_image`
- 不再把 `startFramePath / endFramePath` 映射成首帧 / 尾帧语义

这意味着当前仓库里接入的 Seedance 语义重点是：

- 多模态参考视频生成
- 多参考图约束人物和场景

而不是：

- 首尾帧严格控制

## 命令行入口

当前最方便的联调入口是：

```bash
corepack pnpm smoke:seedance-video --image <path-or-url>
```

最小示例：

```bash
corepack pnpm smoke:seedance-video \
  --image .\char.png \
  --image .\char2.png \
  --image .\scene.png \
  --prompt "参考char.png和char2.png中的人物形象，以及scene.png中的场景环境，生成一个4秒的连续短片。保持人物外观稳定、场景一致，镜头平稳，动作自然，轻微表情和身体动作即可。" \
  --duration 4 \
  --no-generate-audio \
  --no-return-last-frame
```

只提交、不轮询：

```bash
corepack pnpm smoke:seedance-video \
  --image .\char.png \
  --image .\char2.png \
  --image .\scene.png \
  --prompt "参考char.png和char2.png中的人物形象，以及scene.png中的场景环境，生成一个4秒的连续短片。保持人物外观稳定、场景一致，镜头平稳，动作自然，轻微表情和身体动作即可。" \
  --duration 4 \
  --no-generate-audio \
  --no-return-last-frame \
  --no-poll
```

常用可选参数：

- `--image`
- `--video`
- `--audio`
- `--draft-task-id`
- `--prompt`
- `--model`
- `--resolution`
- `--ratio`
- `--duration`
- `--generate-audio`
- `--no-generate-audio`
- `--return-last-frame`
- `--no-return-last-frame`
- `--poll-interval-ms`
- `--poll-timeout-ms`
- `--no-poll`

## 2026-04-18 真实联调结果

`2026-04-18` 我在当前仓库里使用官方方舟 Seedance API 做了一次真实联调，使用了 3 张本地参考图：

- `char.png`
- `char2.png`
- `scene.png`

联调命令的目标是：

- 只生成 `4` 秒视频
- 关闭音频
- 不返回尾帧
- 使用多图参考稳定人物和场景

### 已确认成功的部分

真实任务已成功完成：

- `taskId`: `cgt-20260418124945-k2f58`
- `status`: `succeeded`
- `model`: `doubao-seedance-2-0-260128`
- `duration`: `4`
- `generate_audio`: `false`

服务端实际返回：

- `resolution = "720p"`
- `ratio = "9:16"`

这说明以下链路已经验证通过：

- 仓库中的 `SEEDANCE_API_BASE_URL` / `SEEDANCE_API_TOKEN` 可用
- 新的 Seedance Provider 可以成功提交真实任务
- 多张本地参考图输入可用
- 任务查询与轮询链路可用
- 最终视频 URL 可拿到

### 测试产物

这次联调下载后的文件位于：

- `deliverables/seedance-test-cgt-20260418124945-k2f58.mp4`

## 常见问题

### 1. 为什么不能把官方方舟地址写到 `VECTORENGINE_BASE_URL`

因为项目里其他文字、图片、Kling、Sora 链路还在依赖 VectorEngine。

如果把 `VECTORENGINE_BASE_URL` 改成方舟官方地址，会破坏现有其他能力的调用路径。

### 2. 为什么 `duration` 不能放进环境变量

因为它是单次任务决策，不是全局稳定配置。

比如：

- 这次测试你要 `4` 秒
- 下次正式生成可能要 `6` 秒
- 再下一次可能需要开启尾帧返回

这类值应该由运行时决定，而不是用 `.env` 固化。

### 3. 为什么当前 stage adapter 只把 `startFramePath` 当参考图

因为这个项目当前接入 Seedance 的目标是多模态参考视频，不是首尾帧严格控制。

如果后续真的要支持 Seedance 的其他模式，建议在更高一层显式区分：

- 多模态参考
- 首帧模式
- 首尾帧模式

而不是继续把它们都塞进同一个统一视频口子里。

### 4. 没有音频时能不能提交

可以。

当前官方能力是：

- 音频不能单独输入
- 但可以完全不输入音频

所以最稳的最小测试方式就是：

- 只传图片参考
- `--no-generate-audio`

## 建议用法

如果你现在只是想验证 Provider 是否可用，推荐顺序是：

1. 先只传 `1 到 3` 张本地参考图
2. 时长固定用 `4` 秒
3. 先关闭音频
4. 先关闭尾帧返回
5. 先用 `--no-poll` 提交，拿到 `taskId`
6. 再单独查询这个 `taskId`

这样最省费用，也最容易把问题定位清楚。

## 官方参考

以下官方页面和当前实现直接相关：

- 获取 API Key
  - `https://www.volcengine.com/docs/82379/1541594`
- Base URL 及鉴权
  - `https://www.volcengine.com/docs/82379/1298459`
- 创建视频生成任务 API
  - `https://www.volcengine.com/docs/82379/1520757`
- 查询视频生成任务 API
  - `https://www.volcengine.com/docs/82379/1521309`

## 结论

截至 `2026-04-18`，当前仓库中的 Seedance Provider 已经可以使用官方方舟 API 成功完成真实视频生成。

当前最关键的使用规则是：

- Seedance 使用独立的 `SEEDANCE_API_*` 配置
- 不要修改 `VECTORENGINE_BASE_URL`
- `duration / generateAudio / returnLastFrame` 必须在运行时决定
- 最小真实联调建议使用多图参考、4 秒、无音频的方式
