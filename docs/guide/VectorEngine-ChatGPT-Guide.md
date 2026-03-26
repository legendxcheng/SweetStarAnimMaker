# VectorEngine ChatGPT 兼容模型使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 调用 OpenAI Chat 兼容接口，并给出 `grok-4.2` 的最小可用测试方法、真实联调结果、以及当前仓库里的接入现状。

本文内容基于当前仓库实现、VectorEngine 官方 Apifox 文档，以及 2026-03-25 的实际联调结果整理。

## 当前接口定位

这次接入不是走 Gemini 的：

```text
/v1beta/models/<model>:generateContent
```

而是走 VectorEngine 的 ChatGPT 兼容接口：

```text
POST /v1/chat/completions
GET  /v1/models
```

认证方式仍然是：

```text
Authorization: Bearer <VECTORENGINE_API_TOKEN>
```

官方参考页面：

- 非流式：`https://vectorengine.apifox.cn/api-349239080`
- 流式：`https://vectorengine.apifox.cn/api-349239079`

这意味着：

- 请求体风格是 OpenAI Chat Completions 兼容格式
- 核心字段是 `model` 和 `messages`
- 当前测试模型名为 `grok-4.2`

## 当前已验证可用的模型

在当前账号和当前环境下，我先调用了：

```text
GET https://api.vectorengine.ai/v1/models
```

联调结果显示：

- 当前账号可以成功列出模型
- `grok-4.2` 在当前模型列表中可见
- 当前这次测试里返回的模型总数为 `644`

这说明当前 token 至少已经具备：

- 访问 ChatGPT 兼容模型列表的权限
- 调用 `grok-4.2` 的基础可见性

## 环境变量

最少需要：

```env
VECTORENGINE_API_TOKEN=your-token
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
```

当前仓库里已经在多个 VectorEngine guide 和 provider 中复用这两个变量，因此这次 ChatGPT 兼容模型调用也建议继续使用同一套命名。

说明：

- `VECTORENGINE_API_TOKEN` 是必须项
- `VECTORENGINE_BASE_URL` 可选，不传时可默认使用 `https://api.vectorengine.ai`

## 最小可用请求

根据官方文档，这类模型的最小请求体结构是：

```json
{
  "model": "grok-4.2",
  "messages": [
    {
      "role": "system",
      "content": "You are a concise assistant."
    },
    {
      "role": "user",
      "content": "请只回复 OK 和当前模型名。"
    }
  ],
  "max_tokens": 64,
  "temperature": 0
}
```

核心点只有三项：

- `model`: 这里使用 `grok-4.2`
- `messages`: 使用 OpenAI Chat 风格的消息数组
- `Authorization: Bearer <token>`: 仍然放在请求头

## JavaScript 非流式示例

```javascript
const response = await fetch("https://api.vectorengine.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer <VECTORENGINE_API_TOKEN>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "grok-4.2",
    messages: [
      { role: "system", content: "You are a concise assistant." },
      { role: "user", content: "请只回复 OK 和当前模型名。" },
    ],
    max_tokens: 64,
    temperature: 0,
  }),
});

const result = await response.json();
console.log(result);
```

成功响应通常会包含：

- `id`
- `object`
- `created`
- `model`
- `choices`
- `usage`

业务层通常取值位置是：

```text
choices[0].message.content
```

## PowerShell 非流式示例

Windows 下推荐先用 PowerShell 做最小验证：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @"
{
  "model": "grok-4.2",
  "messages": [
    {
      "role": "system",
      "content": "You are a concise assistant."
    },
    {
      "role": "user",
      "content": "请只回复 OK 和当前模型名。"
    }
  ],
  "max_tokens": 64,
  "temperature": 0
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/v1/chat/completions" `
  -Headers $headers `
  -Body $body
```

## PowerShell 流式示例

如果要验证 SSE 流式返回，可以带上 `stream: true`：

```powershell
$headers = @{
  Authorization = "Bearer $env:VECTORENGINE_API_TOKEN"
  "Content-Type" = "application/json"
  Accept = "text/event-stream"
}

$body = @"
{
  "model": "grok-4.2",
  "stream": true,
  "messages": [
    {
      "role": "user",
      "content": "请只回复 STREAM_OK"
    }
  ],
  "max_tokens": 32,
  "temperature": 0
}
"@

Invoke-WebRequest `
  -Method Post `
  -Uri "https://api.vectorengine.ai/v1/chat/completions" `
  -Headers $headers `
  -Body $body
```

流式响应是标准 SSE，通常长这样：

```text
data: {"object":"chat.completion.chunk", ...}
data: {"object":"chat.completion.chunk", ...}
data: [DONE]
```

## 2026-03-25 实际联调结果

2026-03-25 我在当前仓库环境里做了三步真实测试。

### 1. 列模型

实际请求：

```text
GET https://api.vectorengine.ai/v1/models
```

结果：

- 请求成功
- 当前返回模型总数为 `644`
- `grok-4.2` 已确认在列表内

### 2. 非流式聊天补全

实际请求：

```text
POST https://api.vectorengine.ai/v1/chat/completions
```

请求模型：

```text
grok-4.2
```

结果：

- 请求成功
- 返回 `model = "grok-4.2"`
- `finish_reason = "stop"`
- 回复内容为 `OK Grok`
- `usage.total_tokens = 31`

这说明：

- 当前 `VECTORENGINE_API_TOKEN` 可用于 ChatGPT 兼容聊天接口
- `grok-4.2` 在当前账号下可直接走非流式补全
- 返回结构与标准 Chat Completions 兼容格式一致

### 3. 流式聊天补全

同样使用 `grok-4.2` 发起了 `stream: true` 请求。

结果：

- 请求成功
- 返回内容为标准 SSE `data:` chunk
- 最终收到了 `data: [DONE]`
- 实际内容增量拆成了 `STREAM` 和 `_OK`

这说明：

- 当前账号下 `grok-4.2` 的流式调用链也可用
- 可以按标准 SSE 方式逐块读取内容

## 一个重要观察

这次流式测试里，我观察到返回 chunk 中除了正常的 `delta.content`，还出现了：

```text
delta.reasoning_content
```

这意味着业务接入时要明确区分两类输出：

- `delta.content`: 正常给用户看的回答内容
- `delta.reasoning_content`: 模型的推理增量内容

如果后续你要把流式结果直接透传到前端，建议默认只消费和展示 `content`，不要把 `reasoning_content` 原样暴露给最终用户，除非产品层明确需要。

## 当前仓库接入现状

当前仓库里已经接好的文本模型 provider 是 Gemini 风格接口，例如：

- `packages/services/src/providers/gemini-storyboard-provider.ts`
- `packages/services/src/providers/gemini-shot-script-provider.ts`
- `packages/services/src/providers/gemini-frame-prompt-provider.ts`
- `packages/services/src/providers/gemini-character-sheet-provider.ts`

这些 provider 走的是：

```text
/v1beta/models/<model>:generateContent
```

不是这次 `grok-4.2` 所用的：

```text
/v1/chat/completions
```

截至 2026-03-25，当前仓库里还没有专门针对 ChatGPT 兼容模型的：

- 独立 provider
- 独立 smoke 测试脚本

所以这份文档当前的重点是：

- 先验证平台接口确实可用
- 先确认 `grok-4.2` 在当前账号下能真实返回结果
- 为后续写 `openai-compatible` provider 提供最小可用请求依据

## 推荐接入顺序

如果后续要把 `grok-4.2` 正式接入项目，建议顺序如下：

1. 先保留这份最小 PowerShell 或 `fetch` 请求作为平台连通性验证
2. 再新增一个独立的 ChatGPT 兼容 provider，不要复用 Gemini provider
3. 在 provider 层统一处理 `choices[0].message.content`
4. 如果要支持流式，再单独设计对 `delta.content` 和 `delta.reasoning_content` 的过滤策略

原因是：

- Gemini `generateContent` 和 Chat Completions 的请求体结构不同
- 响应解析位置也不同
- 流式返回的数据块格式也不同

直接硬改现有 Gemini provider，会把两套协议耦合在一起，后面维护会更乱。

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
- 把 Gemini 接口路径和 ChatGPT 接口路径混用了

优先检查：

- `POST https://api.vectorengine.ai/v1/chat/completions`
- `GET https://api.vectorengine.ai/v1/models`

### 400

常见原因：

- `model` 缺失
- `messages` 结构不对
- `messages[].role` 或 `messages[].content` 不符合要求

处理建议：

- 先退回到本文的最小请求体
- 先确认最小请求能通，再逐步追加参数

### 流式结果“看起来不对”

常见原因：

- 把 SSE 当成普通 JSON 一次性解析
- 直接把 `reasoning_content` 也渲染到了用户界面

处理建议：

- 按 `data:` 行逐条解析
- 只把 `delta.content` 作为默认用户输出
- 遇到 `data: [DONE]` 视为流结束

## 结论

截至 2026-03-25，当前仓库环境已经确认：

- 可以复用现有 `VECTORENGINE_API_TOKEN`
- 可以通过 `GET /v1/models` 看到 `grok-4.2`
- 可以通过 `POST /v1/chat/completions` 成功调用 `grok-4.2`
- 非流式和流式两条调用链都已真实验证通过

当前推荐的最小联调入口就是：

```text
POST https://api.vectorengine.ai/v1/chat/completions
model = grok-4.2
```
