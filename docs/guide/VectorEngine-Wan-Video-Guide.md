# VectorEngine Wan Video 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 调用 `wan2.6-i2v` 图生视频接口，并给出最小可用脚本入口、当前仓库实现位置、以及 2026-03-24 的真实联调结果。

本文内容基于当前仓库实现和 2026-03-24 的实际联调结果整理。

## 当前接入范围

当前仓库只接入了一个最小可复用调用入口，还没有正式接进项目的视频 pipeline。

当前提供两层入口：

- 代码入口：`packages/services/src/providers/wan-video-provider.ts`
- 命令行入口：`tooling/scripts/test-wan-video-provider.ts`

这样后续如果要把 Wan 视频生成正式接进任务流，可以直接复用 provider，不需要再重写 VectorEngine 调用逻辑。

## 接口定位

当前接入的接口是：

```text
POST /alibailian/api/v1/services/aigc/video-generation/video-synthesis
GET  /alibailian/api/v1/tasks/{task-id}
```

认证方式仍然是：

```text
Authorization: Bearer <VECTORENGINE_API_TOKEN>
```

也就是说，这次 Wan 视频调用和项目里现有的生图、Gemini、Kling、Sora 调用一样，继续复用同一个 `VECTORENGINE_API_TOKEN`。

## 当前默认配置

provider 当前默认值如下：

- `baseUrl`: `https://api.vectorengine.ai`
- `modelName`: `wan2.6-i2v`

可选参数当前支持：

- `resolution`
- `promptExtend`
- `audio`

说明：

- 当前 provider 不会强行补默认的 `resolution`
- 如果你传入 `promptExtend` 或 `audio`，会写入 `parameters.prompt_extend` / `parameters.audio`
- 如果不传这些字段，provider 会保持最小请求体，不额外补参数

## 请求体字段

当前最小请求体重点字段是：

```json
{
  "model": "wan2.6-i2v",
  "input": {
    "prompt": "让角色保持主体稳定，轻微眨眼和发丝摆动，镜头缓慢推进。",
    "img_url": "https://public.example/start.png"
  },
  "parameters": {
    "resolution": "480P",
    "prompt_extend": true,
    "audio": true
  }
}
```

这里最重要的是：

- `input.prompt` 是视频描述
- `input.img_url` 是输入图片 URL
- `parameters` 是可选附加参数，不是必须字段

如果你传的是本地文件路径，不能直接把磁盘路径发给 VectorEngine。当前脚本和 provider 会先复用项目里现有的 reference image uploader，把本地图片上传成公网 URL，再把 URL 写到 `input.img_url`。

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
- 如果本地图片上传失败，Wan 请求不会发出

相关说明可同时参考：

- `docs/guide/VectorEngine-Image-Guide.md`

## 仓库内代码入口

代码入口位于：

- `packages/services/src/providers/wan-video-provider.ts`

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
corepack pnpm smoke:wan-video --image <path-or-url> --prompt <text>
```

例如：

```bash
corepack pnpm smoke:wan-video \
  --image .\character-preview-after-restart.png \
  --prompt "让角色保持主体稳定，轻微眨眼和发丝摆动，镜头缓慢推进。"
```

只提交、不轮询：

```bash
corepack pnpm smoke:wan-video \
  --image .\character-preview-after-restart.png \
  --prompt "让角色保持主体稳定，轻微眨眼和发丝摆动，镜头缓慢推进。" \
  --no-poll
```

常用可选参数：

- `--model`
- `--resolution`
- `--prompt-extend`
- `--no-prompt-extend`
- `--audio`
- `--no-audio`
- `--request-timeout-ms`
- `--poll-interval-ms`
- `--poll-timeout-ms`
- `--no-poll`

## PowerShell 最小调用示例

如果你已经有公网可访问的输入图 URL，可以直接用 PowerShell 验证提交接口：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @"
{
  "model": "wan2.6-i2v",
  "input": {
    "prompt": "让角色保持主体稳定，轻微眨眼和发丝摆动，镜头缓慢推进。",
    "img_url": "https://public.example/start.png"
  },
  "parameters": {
    "resolution": "480P",
    "prompt_extend": true,
    "audio": true
  }
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/alibailian/api/v1/services/aigc/video-generation/video-synthesis" `
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
  -Uri "https://api.vectorengine.ai/alibailian/api/v1/tasks/<task-id>" `
  -Headers $headers
```

## 2026-03-24 实际联调结果

2026-03-24 我在当前仓库里做了两次真实 Wan 调用验证。

### 已确认成功的部分

通过根脚本发起了真实 `wan2.6-i2v` 提交请求：

- 提交命令：`corepack pnpm smoke:wan-video --image .\character-preview-after-restart.png --prompt "让角色保持主体稳定，轻微眨眼和发丝摆动，镜头缓慢推进。" --poll-interval-ms 10000 --poll-timeout-ms 300000`

这说明以下几点已经验证通过：

- 当前 `VECTORENGINE_API_TOKEN` 可用于 Wan 视频接口
- `POST /alibailian/api/v1/services/aigc/video-generation/video-synthesis` 调用链已打通
- 本地图片先上传再提交视频任务的路径可用
- 当前请求体结构 `model + input.prompt + input.img_url` 可被平台接受到业务层

### 当前阻塞点

两次真实请求都在提交阶段返回了同一个平台错误：

```text
Wan video provider request failed with status 500; body={"code":"get_channel_failed","message":"当前分组上游负载已饱和，请稍后再试","data":null}
```

这说明当前问题不是：

- 本地 `.env` 没生效
- token 缺失
- 路径写错
- `Authorization` 头缺失
- 本地图片上传逻辑没跑通

当前更像是平台上游通道拥塞或分组容量不足。

截至 2026-03-24 当前这次联调窗口内，我确认了“请求已进入真实服务端”，但没有拿到可用 `taskId`，因此也还没有进入查询终态和视频 URL 验证阶段。

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
- 路径不是 `/alibailian/api/v1/services/aigc/video-generation/video-synthesis`
- 查询接口没有带任务 ID

优先检查：

- `POST https://api.vectorengine.ai/alibailian/api/v1/services/aigc/video-generation/video-synthesis`
- `GET https://api.vectorengine.ai/alibailian/api/v1/tasks/<task-id>`

### 500 `get_channel_failed`

这次真实联调里遇到的就是这个错误：

```json
{
  "code": "get_channel_failed",
  "message": "当前分组上游负载已饱和，请稍后再试",
  "data": null
}
```

这类问题通常不是代码结构错误，而是平台瞬时负载、账号分组容量或上游可用性问题。

处理建议：

- 先直接重试一次最小请求
- 不要先怀疑本地脚本或 provider 结构
- 如果持续失败，优先联系平台侧确认 `wan2.6-i2v` 当前账号可用性和分组容量

### 本地路径直接提交失败

常见原因：

- 你直接把 `C:\...` 或 `E:\...` 发给了 VectorEngine
- 或者图床上传失败

处理建议：

- 优先走仓库脚本，让它自动上传本地图片
- 如果脚本报 uploader 失败，先检查 `psda1` / `picgo` 配置

## 接入建议

如果后续要正式接到视频 pipeline，建议顺序如下：

1. 继续复用 `createWanVideoProvider()`
2. 在核心层增加独立的视频 provider port，不要复用现有图片 provider 抽象
3. 把“提交任务”和“查询任务终态”分开建 use case
4. 对 `get_channel_failed` 这类平台拥塞错误加入有限次重试，不要直接把瞬时失败等同于模型不可用

## 结论

截至 2026-03-24，当前仓库里的 Wan 最小调用入口已经接好。

已确认：

- 可以复用现有 `VECTORENGINE_API_TOKEN`
- 可以用本地图片发起 `wan2.6-i2v` 的真实提交请求
- 请求已经进入真实平台业务层

尚未确认：

- 当前账号是否能稳定拿到 `wan2.6-i2v` 的任务通道
- 是否能稳定拿到真实 `taskId`
- 是否能查询到终态和最终视频 URL

当前推荐的最小联调入口就是：

```bash
corepack pnpm smoke:wan-video --image <path-or-url> --prompt "..."
```
