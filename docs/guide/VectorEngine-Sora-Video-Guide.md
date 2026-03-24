# VectorEngine Sora Video 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 调用 Sora 双图视频接口，并给出最小可用脚本入口、真实联调结果、以及常见故障排查方式。

本文内容基于当前仓库实现和 2026-03-24 的实际联调结果整理。

## 当前接入范围

当前仓库只接入了一个最小可复用调用入口，还没有正式接进项目的视频 pipeline。

当前提供两层入口：

- 代码入口：`packages/services/src/providers/sora-video-provider.ts`
- 命令行入口：`tooling/scripts/test-sora-video-provider.ts`

这样后续如果要把 Sora 视频生成接进正式任务流，可以直接复用 provider，不需要再重写 VectorEngine 调用逻辑。

## 接口定位

当前接入的接口是：

```text
POST /v1/video/create
GET  /v1/video/query?id=<task-id>
```

认证方式仍然是：

```text
Authorization: Bearer <VECTORENGINE_API_TOKEN>
```

也就是说，这次 Sora 视频调用和项目里现有的生图、Gemini、Kling 调用一样，继续复用同一个 `VECTORENGINE_API_TOKEN`。

## 当前默认配置

provider 当前默认值如下：

- `baseUrl`: `https://api.vectorengine.ai`
- `modelName`: `sora-2-all`
- `orientation`: `portrait`
- `size`: `large`
- `duration`: `15`

说明：

- 当前仓库默认 smoke 脚本已经切到 `sora-2-all`
- `--model` 仍然保留，可手动覆盖
- 2026-03-24 的真实联调中，`sora-2-all` 已经成功提交并完成

## 请求体字段

当前最小请求体重点字段是：

```json
{
  "images": [
    "https://public.example/start.png",
    "https://public.example/end.png"
  ],
  "model": "sora-2-all",
  "orientation": "portrait",
  "prompt": "让首尾帧之间平滑转场，角色向镜头缓慢靠近。",
  "size": "large",
  "duration": 15,
  "watermark": false,
  "private": true
}
```

这里最重要的是：

- `images[0]` 是首帧
- `images[1]` 是尾帧
- `prompt` 仍然是必须字段

如果你传的是本地文件路径，不能直接把磁盘路径发给 VectorEngine。当前脚本和 provider 会先复用项目里现有的 reference image uploader，把本地图片上传成公网 URL，再把 URL 写到 `images` 数组里。

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
- 如果本地图片上传失败，Sora 请求不会发出

相关说明可同时参考：

- `docs/guide/VectorEngine-Image-Guide.md`

## 仓库内代码入口

代码入口位于：

- `packages/services/src/providers/sora-video-provider.ts`

当前 provider 提供 3 个方法：

- `submitImageToVideo()`
- `getImageToVideoTask()`
- `waitForImageToVideoTask()`

职责分别是：

- 提交双图视频任务
- 查询单个任务状态
- 轮询直到任务进入终态

## 命令行入口

当前最方便的联调入口是根脚本：

```bash
corepack pnpm smoke:sora-video --image <path-or-url> --image-tail <path-or-url>
```

例如：

```bash
corepack pnpm smoke:sora-video \
  --image .\character-preview-after-restart.png \
  --image-tail .\character-preview-after-restart.png \
  --prompt "让角色保持主体稳定，做一个轻微呼吸和镜头缓慢推进的短动画。"
```

只提交、不轮询：

```bash
corepack pnpm smoke:sora-video \
  --image .\character-preview-after-restart.png \
  --image-tail .\character-preview-after-restart.png \
  --prompt "让角色保持主体稳定，做一个轻微呼吸和镜头缓慢推进的短动画。" \
  --no-poll
```

常用可选参数：

- `--prompt`
- `--model`
- `--orientation`
- `--size`
- `--duration`
- `--watermark`
- `--no-watermark`
- `--private`
- `--public`
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
  "images": [
    "https://public.example/start.png",
    "https://public.example/end.png"
  ],
  "model": "sora-2-all",
  "orientation": "portrait",
  "prompt": "让角色保持主体稳定，做一个轻微呼吸和镜头缓慢推进的短动画。",
  "size": "large",
  "duration": 15,
  "watermark": false,
  "private": true
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/v1/video/create" `
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
  -Uri "https://api.vectorengine.ai/v1/video/query?id=<task-id>" `
  -Headers $headers
```

## 2026-03-24 实际联调结果

2026-03-24 我在当前仓库里做了真实 Sora 调用验证。

### 已确认成功的部分

通过根脚本成功提交了真实 `sora-2-all` 任务：

- 提交命令：`corepack pnpm smoke:sora-video --image https://...png --image-tail https://...png --prompt "..."`
- 返回任务 ID：`sora-2:bc160fdf-82cf-425c-9ce9-cade9053ea7c`
- 初始状态：`pending`

随后查询该任务，最终确认状态为：

- `status = "completed"`
- `completed = true`
- `failed = false`

返回资源：

- `videoUrl = "https://pro.filesystem.site/cdn/20260324/97290076221797f98a0349270aa7c7.mp4"`
- `thumbnailUrl = "https://pro.filesystem.site/cdn/20260324/00cb04745bf1ddefefa90f5f3dbfb1.webp"`

这说明以下几点已经验证通过：

- 当前 `VECTORENGINE_API_TOKEN` 可用于 Sora 视频接口
- `POST /v1/video/create` 调用链可用
- `GET /v1/video/query` 查询链可用
- 本地图片先上传再提交视频任务的路径可用
- `sora-2-all` 在当前账号下至少可以成功创建并完成任务

### 观察到的平台行为

在这次成功查询里，平台返回中出现：

- 请求时传的是 `model = "sora-2-all"`
- 查询结果原始响应里出现 `model = "sora-2"`

这说明平台内部可能会把 `sora-2-all` 映射到一个统一的 Sora 模型标识返回。当前仓库不依赖查询结果里的 `model` 字段做业务判断，因此不会影响当前脚本使用。

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
- 查询接口没有带 `id`

优先检查：

- `POST https://api.vectorengine.ai/v1/video/create`
- `GET https://api.vectorengine.ai/v1/video/query?id=<task-id>`

### 500

这次联调里遇到过一次平台返回：

```text
当前分组上游负载已饱和，请稍后再试
```

这类问题通常不是代码结构错误，而是平台瞬时负载或上游可用性问题。

处理建议：

- 先直接重试一次最小请求
- 不要先怀疑本地脚本或 provider 结构
- 如果同一模型持续失败，可以暂时切换到当前已验证可用的默认模型

### 本地路径直接提交失败

常见原因：

- 你直接把 `C:\...` 或 `E:\...` 发给了 VectorEngine
- 或者图床上传失败

处理建议：

- 优先走仓库脚本，让它自动上传本地图片
- 如果脚本报 uploader 失败，先检查 `psda1` / `picgo` 配置

## 接入建议

如果后续要正式接到视频 pipeline，建议顺序如下：

1. 继续复用 `createSoraVideoProvider()`
2. 在核心层增加独立的视频 provider port，不要复用现有图片 provider 抽象
3. 把“提交任务”和“查询任务终态”分开建 use case
4. 在任务系统里保留异步视频生成状态，不要假设请求返回时就已经拿到视频文件

## 结论

截至 2026-03-24，当前仓库里的 Sora 最小调用入口已经可用。

已确认：

- 可以复用现有 `VECTORENGINE_API_TOKEN`
- 可以用双图方式发起 `sora-2-all` 视频任务
- 可以拿到真实 `taskId`
- 可以查询任务状态
- 可以拿到最终视频 URL 和缩略图 URL

当前推荐的最小联调入口就是：

```bash
corepack pnpm smoke:sora-video --image <path-or-url> --image-tail <path-or-url> --prompt "..."
```
