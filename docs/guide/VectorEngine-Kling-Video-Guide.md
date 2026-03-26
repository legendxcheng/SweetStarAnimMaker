# VectorEngine Kling Video 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 调用 Kling 图生视频接口，并给出最小可用脚本入口、真实联调结果、以及常见故障排查方式。

本文内容基于当前仓库实现，以及 2026-03-24 到 2026-03-26 的实际联调结果整理。

## 当前接入范围

当前仓库只接入了一个最小可复用调用入口，还没有正式接进项目的视频 pipeline。

当前提供两层入口：

- 代码入口：`packages/services/src/providers/kling-video-provider.ts`
- 命令行入口：`tooling/scripts/test-kling-video-provider.ts`

这样后续做正式的视频任务流时，可以直接复用 provider，不需要再重写 VectorEngine 调用逻辑。

## 接口定位

当前接入的接口是：

```text
POST /kling/v1/videos/image2video
GET  /kling/v1/videos/image2video/{id}
```

认证方式仍然是：

```text
Authorization: Bearer <VECTORENGINE_API_TOKEN>
```

也就是说，这次 Kling 视频调用和项目里现有的生图、Gemini 调用一样，继续复用同一个 `VECTORENGINE_API_TOKEN`。
## 2026-03-26 官方 Omni Video 实测补充

除了当前仓库已经接入的 `image2video` 之外，2026-03-26 我还额外对照官方 Kling Omni Video 文档，直接验证了 VectorEngine 的 `omni-video` 中转接口。

参考文档：

- VectorEngine Apifox：`https://vectorengine.apifox.cn/api-394023139`
- Kling 官方文档：`https://app.klingai.com/cn/dev/document-api/apiReference/model/OmniVideo`

这次额外验证使用的中转路径是：

```text
POST /kling/v1/videos/omni-video
GET  /kling/v1/videos/omni-video/{id}
GET  /kling/v1/videos/omni-video?pageNum=1&pageSize=30
```

注意：

- 当前仓库里的 provider 和 smoke 脚本仍然只正式接了 `image2video`
- 下面这一节只是说明：VectorEngine 的 `omni-video` 中转在当前账号下已经做过真实探测

### 这次验证的前提结论

如果后续只考虑 `kling-v3-omni`，当前实测结论是：

- `kling-v3-omni` 模型可以成功创建 `omni-video` 任务
- `kling-v3-omni` + `duration=3` 可以成功创建任务
- 单任务查询接口可用
- 列表查询接口在 VectorEngine 中转地址上当前没有返回 JSON，而是返回 HTML 页面

### 已确认成功的请求

#### 1. `kling-v3-omni` 创建任务可用

实测请求体包含：

```json
{
  "model_name": "kling-v3-omni",
  "prompt": "让<<<image_1>>>保持主体稳定，做轻微镜头推进。",
  "image_list": [
    {
      "image_url": "https://h2.inkwai.com/bs2/upload-ylab-stunt/se/ai_portal_queue_mmu_image_upscale_aiweb/3214b798-e1b4-4b00-b7af-72b5b0417420_raw_image_0.jpg"
    }
  ],
  "mode": "pro",
  "aspect_ratio": "16:9",
  "shot_type": "customize",
  "duration": "3"
}
```

实际成功返回过的任务包括：

- `865962896030339133`
- `865965353288339525`

这说明以下几点已经验证通过：

- VectorEngine 的 `POST /kling/v1/videos/omni-video` 在当前账号下可用
- `model_name = "kling-v3-omni"` 可用
- `duration = 3` 在 `kling-v3-omni` 下可用

#### 2. 单任务查询接口可用

实测查询：

```text
GET /kling/v1/videos/omni-video/{taskId}
```

对任务 `865965353288339525` 查询时，成功返回：

- `message = "SUCCEED"`
- `data.task_status = "submitted"`

这说明：

- VectorEngine 的 `GET /kling/v1/videos/omni-video/{id}` 在当前账号下可用
- 判断任务状态时，仍然应以 `data.task_status` 为准，而不是只看顶层 `message`

#### 3. 列表查询接口当前不按 JSON API 返回

我还实测了：

```text
GET /kling/v1/videos/omni-video?pageNum=1&pageSize=5
```

返回结果是：

- `HTTP 200`
- `Content-Type: text/html; charset=utf-8`
- 响应体是网页 HTML，不是 JSON

这说明至少截至 2026-03-26：

- 官方文档里的“查询任务（列表）”接口
- 在 VectorEngine 的 `https://api.vectorengine.ai/kling/v1/videos/omni-video?pageNum=...` 这条中转路径上
- 当前没有表现出可直接当作 JSON API 使用的行为

### 关于 `duration` 的当前判断

这次联调里有一个容易混淆的点：

- `kling-video-o1` + `duration=3`，多次实测返回 `429`
- 但同一时间段内，不带 `duration` 的对照请求可以成功
- `kling-v3-omni` + `duration=3` 则可以成功创建任务

因此如果你的目标模型固定是 `kling-v3-omni`，当前可以把以下结论当作已验证事实：

- `duration=3` 可用

但如果你不显式指定模型，不能把这个结论泛化到 `kling-video-o1`。

## 当前默认配置

provider 当前默认值如下：

- `baseUrl`: `https://api.vectorengine.ai`
- `modelName`: `kling-v3`
- `mode`: `pro`
- `duration`: `5`

说明：

- `kling-v3` 实测不传 `duration` 会被平台拒绝
- 当前 provider 会默认补 `duration: 5`
- 如果你手动传入 `duration`，建议保持在 `3` 到 `15` 秒之间

## 请求体字段

当前最小请求体重点字段是：

```json
{
  "model_name": "kling-v3",
  "mode": "pro",
  "image": "https://public.example/start.png",
  "image_tail": "https://public.example/end.png",
  "prompt": "可选",
  "negative_prompt": "可选",
  "duration": 5
}
```

这里最重要的是：

- `image` 是首帧
- `image_tail` 是尾帧

如果你传的是本地文件路径，不能直接把磁盘路径发给 VectorEngine。当前脚本和 provider 会先复用项目里现有的 reference image uploader，把本地图片上传成公网 URL，再把 URL 写到 `image` 和 `image_tail`。

## 环境变量

最少需要：

```env
VECTORENGINE_API_TOKEN=your-token
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
```

如果你打算直接传本地图片路径，建议同时配置：

```env
IMAGE_UPLOAD_PROVIDER_ORDER=psda1,picgo
PICGO_API_KEY=your-picgo-api-key
```

说明：

- 当前 uploader 默认顺序是 `psda1,picgo`
- 如果 `psda1` 可用，可以不需要 `PICGO_API_KEY`
- 如果本地图片上传失败，Kling 请求不会发出

相关说明可同时参考：

- `docs/guide/VectorEngine-Image-Guide.md`

## 仓库内代码入口

代码入口位于：

- `packages/services/src/providers/kling-video-provider.ts`

当前 provider 提供 3 个方法：

- `submitImageToVideo()`
- `getImageToVideoTask()`
- `waitForImageToVideoTask()`

职责分别是：

- 提交图生视频任务
- 查询单个任务状态
- 轮询直到任务进入终态

## 命令行入口

当前最方便的联调入口是根脚本：

```bash
corepack pnpm smoke:kling-video --image <path-or-url> --image-tail <path-or-url>
```

例如：

```bash
corepack pnpm smoke:kling-video \
  --image .\character-preview-after-restart.png \
  --image-tail .\character-preview-after-restart.png \
  --prompt "保持角色主体稳定，做轻微镜头推进与头发摆动。"
```

只提交、不轮询：

```bash
corepack pnpm smoke:kling-video \
  --image .\character-preview-after-restart.png \
  --image-tail .\character-preview-after-restart.png \
  --prompt "保持角色主体稳定，做轻微镜头推进与头发摆动。" \
  --no-poll
```

常用可选参数：

- `--prompt`
- `--negative-prompt`
- `--model`
- `--mode`
- `--duration`
- `--cfg-scale`
- `--request-timeout-ms`
- `--poll-interval-ms`
- `--poll-timeout-ms`
- `--no-poll`

## PowerShell 最小调用示例

如果你已经有公网可访问的首尾帧 URL，可以直接用 PowerShell 验证提交接口：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @"
{
  "model_name": "kling-v3",
  "mode": "pro",
  "image": "https://public.example/start.png",
  "image_tail": "https://public.example/end.png",
  "prompt": "保持角色主体稳定，做轻微镜头推进与头发摆动。",
  "duration": 5
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/kling/v1/videos/image2video" `
  -Headers $headers `
  -Body $body
```

查询单个任务：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
}

Invoke-WebRequest `
  -Method Get `
  -Uri "https://api.vectorengine.ai/kling/v1/videos/image2video/<task-id>" `
  -Headers $headers
```

## 2026-03-24 实际联调结果

2026-03-24 我在当前仓库里做了两次真实调用验证。

### 已确认成功的部分

通过根脚本成功提交了真实 Kling 任务：

- 提交命令：`corepack pnpm smoke:kling-video --image .\character-preview-after-restart.png --image-tail .\character-preview-after-restart.png --prompt "..."`
- 返回任务 ID：`865349344991014985`
- 返回状态：`submitted`

这说明以下几点已经验证通过：

- 当前 `VECTORENGINE_API_TOKEN` 可用于 Kling 图生视频接口
- `POST /kling/v1/videos/image2video` 调用链可用
- 本地首尾帧上传后再提交视频任务的路径可用
- `kling-v3` + `pro` 在当前账号下至少可以成功创建任务

### 观察到的平台行为

另一次任务：

- 任务 ID：`865347541197025359`

在提交后约 3 分钟内，查询接口持续返回：

- `data.task_status = "submitted"`

同时顶层还会返回：

- `message = "SUCCEED"`

注意：

- 这个顶层 `message = "SUCCEED"` 不是“视频已生成完成”
- 当前应以 `data.task_status` 为准，而不是拿顶层 `message` 判断任务完成

截至 2026-03-24 当前这次联调窗口内，我确认了“任务提交成功”，但没有在 3 分钟观察窗口内拿到终态视频 URL。

## 已处理的真实平台约束

这次联调里已经发现并修正了两个真实约束：

### 1. `kling-v3` 需要 `duration`

如果不传 `duration`，平台会返回类似错误：

```text
duration must be between 3 and 15 for kling-v3
```

因此当前 provider 默认补：

```json
{
  "duration": 5
}
```

### 2. 查询结果不能只看顶层 `message`

实测查询接口会返回：

```json
{
  "message": "SUCCEED",
  "data": {
    "task_status": "submitted"
  }
}
```

所以项目里的解析逻辑现在只把明确的错误字段当作 `errorMessage`，不会把顶层成功消息误判为失败原因。

## 常见错误

### 401 / 403

常见原因：

- token 无效
- token 过期
- token 权限不足

优先检查：

- `Authorization: Bearer <token>` 是否正确
- token 是否带了前后空格

### 404

常见原因：

- URL 写错
- 路径不是 `/kling/v1/videos/image2video`
- 查询接口没有带任务 ID

### 429 或业务错误体

常见原因：

- 参数不满足模型约束
- 平台限流
- 当前模型要求额外字段

这次实测里遇到过：

```text
duration must be between 3 and 15 for kling-v3
```

### 本地路径直接提交失败

常见原因：

- 你直接把 `C:\...` 或 `E:\...` 发给了 VectorEngine
- 或者图床上传失败

处理建议：

- 优先走仓库脚本，让它自动上传本地图片
- 如果脚本报 uploader 失败，先检查 `psda1` / `picgo` 配置

## 接入建议

如果后续要正式接到视频 pipeline，建议顺序如下：

1. 继续复用 `createKlingVideoProvider()`
2. 在核心层增加独立的视频 provider port，不要复用现有图片 provider 抽象
3. 把“提交任务”和“查询任务终态”分开建 use case
4. 在任务系统里保留异步视频生成状态，不要假设请求返回时就已经拿到视频文件

## 结论

截至 2026-03-24，当前仓库里的 Kling 最小调用入口已经可用。

已确认：

- 可以复用现有 `VECTORENGINE_API_TOKEN`
- 可以用本地首尾帧发起 `kling-v3` + `pro` 的图生视频任务
- 可以拿到真实 `taskId`
- 可以查询任务状态

尚未确认：

- 当前账号和当前队列条件下，任务从 `submitted` 到最终视频 URL 的稳定完成时延

