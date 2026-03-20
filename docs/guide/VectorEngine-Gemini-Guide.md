# VectorEngine Gemini 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 这个 AI 中转平台调用 Gemini 模型，并给出最小可用测试方法、项目接入方式、以及常见故障排查思路。

本文内容基于当前仓库实现和 2026-03-20 的实际联调结果整理。

## 平台定位

当前项目不是直接调用 Google 原生 Gemini 接口，而是调用 VectorEngine 提供的兼容中转接口：

```text
https://api.vectorengine.ai/v1beta/models/<model>:generateContent
```

请求方式与 Gemini `generateContent` 风格一致，认证方式为 Bearer Token。

## 当前已验证可用的模型

在当前账号和当前环境下，以下模型已经实际请求成功：

- `gemini-2.5-pro`
- `gemini-3.1-pro-preview`

说明：

- 某个模型一时返回 `503`，不一定表示代码接入有问题，也可能是平台余额、网关状态、模型可用性或瞬时服务波动导致。
- 判断“平台能不能用”，应优先用最小请求直接测试，不要先把问题归因到项目业务代码。

## 认证与环境变量

项目里目前使用以下环境变量：

```env
VECTORENGINE_API_TOKEN=your-token
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview
```

可选运行时变量：

```env
REDIS_URL=redis://127.0.0.1:6379
STUDIO_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000
```

注意：

- `apps/worker` 和 `apps/api` 当前直接读取 `process.env`
- `apps/studio` 通过 Vite 读取 `VITE_*` 变量
- 当前仓库尚未统一实现后端自动加载 `.env`

这意味着：

- 前端的 `VITE_API_BASE_URL` 可以通过 Vite 的 `.env` 机制使用
- 后端若要使用 `.env`，需要先由 shell、启动脚本或你自己的加载逻辑把变量导入到进程环境里

## 最小可用请求

这是最小可用的 `fetch` 请求示例，适合先验证平台、token、模型名是否可用。

```javascript
var myHeaders = new Headers();
myHeaders.append("Authorization", "Bearer <token>");
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  systemInstruction: {
    parts: [
      {
        text: "你是一直小猪.你会在回复开始的时候 加一个'哼哼'",
      },
    ],
  },
  contents: [
    {
      role: "user",
      parts: [
        {
          text: "你是谁?",
        },
      ],
    },
  ],
  generationConfig: {
    temperature: 1,
    topP: 1,
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: 26240,
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch(
  "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent",
  requestOptions,
)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

成功响应通常会包含：

- `candidates`
- `content.parts`
- `modelVersion`
- `usageMetadata`

如果你设置了：

```json
"thinkingConfig": {
  "includeThoughts": true
}
```

则响应中可能出现两段内容：

- 一段 `thought: true` 的思维内容
- 一段最终给用户看的正常文本

业务接入时，通常应只消费最终回答，不应将思维内容直接暴露给最终用户。

## PowerShell 测试示例

Windows 下推荐用 PowerShell 先做最小验证：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @"
{
  "systemInstruction": {
    "parts": [
      {
        "text": "你是一直小猪.你会在回复开始的时候 加一个'哼哼'"
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "你是谁?"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 1,
    "topP": 1,
    "thinkingConfig": {
      "includeThoughts": true,
      "thinkingBudget": 26240
    }
  }
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent" `
  -Headers $headers `
  -Body $body
```

这一步如果成功，说明至少以下几项成立：

- token 可用
- base URL 可达
- 该模型当前可调用

## 本仓库中的接入位置

### Provider 实现

当前 Gemini provider 位于：

- `packages/services/src/providers/gemini-storyboard-provider.ts`

职责：

- 读取 `baseUrl`、`apiToken`、`model`
- 发起 `generateContent` 请求
- 解析模型返回
- 转换为项目内部的 `MasterPlot` 结构

### Worker 注入点

当前 worker 默认从环境变量读取配置，并实例化真实 provider：

- `apps/worker/src/bootstrap/build-spec2-worker-services.ts`

关键读取项：

- `process.env.VECTORENGINE_BASE_URL`
- `process.env.VECTORENGINE_API_TOKEN`
- `process.env.STORYBOARD_LLM_MODEL`

### 注意 smoke 启动脚本

这个脚本：

- `tooling/scripts/start-worker-smoke.mjs`

会强制注入假的 smoke provider，仅用于本地离线联调，不会调用真实 VectorEngine。

如果你要测真实 AI，不要用这个脚本作为 worker 启动方式。

## 在项目里做真实联调的推荐顺序

### 1. 先测最小请求

先直接打 `generateContent`，确认平台和 token 正常。

### 2. 再测 provider

直接调用 `createGeminiStoryboardProvider()`，确认项目代码层可以解析返回结构。

### 3. 再测 worker

启动真实 worker，而不是 smoke worker。

### 4. 最后跑完整业务链路

完整链路是：

- 创建项目
- 触发 `Generate Master Plot`
- worker 调用 VectorEngine
- 任务落盘
- 生成 `master-plot/current.json`

如果一开始就跑全链路，很容易把平台问题、配置问题、解析问题、队列问题混在一起。

## 常见错误与判断方法

### 401 / 403

常见原因：

- token 无效
- token 过期
- token 权限不足

优先检查：

- `Authorization: Bearer <token>` 是否拼对
- token 是否有前后空格

### 404

常见原因：

- URL 写错
- 模型名写错

优先检查：

- `https://api.vectorengine.ai/v1beta/models/<model>:generateContent`
- 模型名是否确实存在并对当前账号开放

### 429

常见原因：

- 频率限制
- 并发过高

处理建议：

- 降低并发
- 增加重试和退避

### 503

常见原因：

- 平台余额不足
- 网关暂时不可用
- 上游模型服务临时不可用
- 当前模型在此时段不可用

处理建议：

- 先复测一次最小请求
- 换一个已知可用模型测试
- 检查平台余额和账号状态

## 项目接入建议

### 建议 1

把“最小请求验证”和“项目业务联调”分开。

### 建议 2

保留一个专门的 smoke 脚本，只做 provider 连通性测试，不要依赖 Redis 和完整任务流。

### 建议 3

在 provider 失败时打印更多信息：

- 请求模型名
- 请求 base URL
- HTTP 状态码
- 响应体摘要

这样排查 `503`、模型不可用、账号异常时会快很多。

### 建议 4

在生产业务逻辑里不要直接依赖 `includeThoughts` 返回给用户。若平台返回思维内容，应只消费最终答案部分。

## 推荐的本仓库默认配置

如果你要让 `Premise -> Master Plot` 优先接通，建议先用：

```env
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview
```

如果后续需要一个更稳的回退模型，可以保留一个备用模型配置，例如：

```env
STORYBOARD_LLM_MODEL=gemini-2.5-pro
```

## 结论

在当前仓库和当前账号下，VectorEngine 这条 Gemini 调用链已经证明可以工作。

真正需要注意的不是“能不能接”，而是：

- 用的是不是真实 worker
- 环境变量有没有进入进程
- 模型名是否当前可用
- 失败时日志是否足够定位问题
