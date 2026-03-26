# VectorEngine Grok Provider 接入指南

## 目的

这份文档说明当前仓库里新增的 `grok-4.2` provider 入口、它与 Gemini provider 的关系、以及后续如何在业务层按需装配。

本文内容基于当前仓库实现和 2026-03-25 的实际联调结果整理。

## 当前接入范围

这次新增的是与 Gemini 平级的一组文本 provider，而不是自动 fallback 逻辑。

当前新增入口：

- `packages/services/src/providers/openai-compatible-chat.ts`
- `packages/services/src/providers/grok-character-sheet-provider.ts`
- `packages/services/src/providers/grok-frame-prompt-provider.ts`
- `packages/services/src/providers/grok-shot-script-provider.ts`
- `packages/services/src/providers/grok-storyboard-provider.ts`

对应导出的工厂函数：

- `createGrokCharacterSheetProvider()`
- `createGrokFramePromptProvider()`
- `createGrokShotScriptProvider()`
- `createGrokStoryboardProvider()`

## 为什么要单独做一套 Grok provider

当前仓库里的 Gemini provider 走的是：

```text
POST /v1beta/models/<model>:generateContent
```

而 `grok-4.2` 走的是：

```text
POST /v1/chat/completions
```

两者差异包括：

- 请求体结构不同
- 响应提取位置不同
- 流式 chunk 结构不同
- JSON 输出约束方式不同

所以这次没有把 Grok 硬塞进现有 Gemini provider，而是把它做成独立 provider 家族。

## 当前 shared transport

新增的：

```text
packages/services/src/providers/openai-compatible-chat.ts
```

职责只有一件事：

- 发送 OpenAI Chat 兼容请求

当前 helper 负责：

- 调用 `POST /v1/chat/completions`
- 处理 `system` + `user` 两段消息
- 处理超时
- 处理非 2xx
- 提取 `choices[0].message.content`
- 可选附带 `response_format: { type: "json_object" }`

它不负责业务 JSON 校验，也不负责 prompt 设计。那些逻辑仍留在具体 provider 内。

## JSON 输出策略

2026-03-25 的真实测试结论是：

- `response_format: { type: "json_object" }` 可以正常使用
- `response_format: { type: "json_schema" }` 这次测试里没有稳定强约束住返回结构

因此当前 Grok JSON provider 的策略是：

1. transport 层使用 `json_object`
2. prompt 里明确要求“只返回 JSON”
3. provider 本地继续做 `JSON.parse()` 和字段校验

也就是说，真正的正确性边界仍然在仓库内的本地验证逻辑，不依赖模型百分百守规。

## 默认配置

这些 Grok provider 默认值是：

- `baseUrl = https://api.vectorengine.ai`
- `model = grok-4.2`

仍然复用现有环境变量：

```env
VECTORENGINE_API_TOKEN=your-token
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
```

如果你手动实例化 provider，可以显式传：

```ts
{
  baseUrl: process.env.VECTORENGINE_BASE_URL,
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  model: "grok-4.2",
}
```

## 最小使用示例

### Storyboard / Master Plot

```ts
import { createGrokStoryboardProvider } from "@sweet-star/services";

const provider = createGrokStoryboardProvider({
  baseUrl: process.env.VECTORENGINE_BASE_URL,
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  model: "grok-4.2",
});
```

### Shot Script

```ts
import { createGrokShotScriptProvider } from "@sweet-star/services";

const provider = createGrokShotScriptProvider({
  baseUrl: process.env.VECTORENGINE_BASE_URL,
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  model: "grok-4.2",
});
```

### Frame Prompt

```ts
import { createGrokFramePromptProvider } from "@sweet-star/services";

const provider = createGrokFramePromptProvider({
  baseUrl: process.env.VECTORENGINE_BASE_URL,
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  model: "grok-4.2",
});
```

### Character Sheet Prompt

```ts
import { createGrokCharacterSheetProvider } from "@sweet-star/services";

const provider = createGrokCharacterSheetProvider({
  baseUrl: process.env.VECTORENGINE_BASE_URL,
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  model: "grok-4.2",
});
```

## 当前没有做的事

这次故意没有做：

- worker 默认改用 Grok
- Gemini 失败自动 fallback 到 Grok
- 环境变量层面的 provider policy 切换

原因很简单：

- 先把 Grok 作为独立能力线接好
- 再单独设计“什么时候切 Grok”这类策略问题

这样后续要做 fallback 时，可以在 worker 装配层或更高一层做组合，而不是把策略写死在 provider 内部。

## 推荐的后续接入顺序

如果后续你要实现“Gemini 拒答时切 Grok”，建议顺序是：

1. 保留当前 Gemini provider 和 Grok provider 并存
2. 在 worker 装配层增加 provider policy
3. 明确哪些错误属于“可回退”，哪些错误属于“直接失败”
4. 单独补 fallback 行为测试，不要把它混进 transport helper

## 验证

这次新增 Grok provider 后，已通过的聚焦测试包括：

- `tests/openai-compatible-chat.test.ts`
- `tests/grok-character-sheet-provider.test.ts`
- `tests/grok-frame-prompt-provider.test.ts`
- `tests/grok-storyboard-provider.test.ts`
- `tests/grok-shot-script-provider.test.ts`

验证命令：

```bash
corepack pnpm --filter @sweet-star/services exec vitest run \
  tests/openai-compatible-chat.test.ts \
  tests/grok-character-sheet-provider.test.ts \
  tests/grok-frame-prompt-provider.test.ts \
  tests/grok-storyboard-provider.test.ts \
  tests/grok-shot-script-provider.test.ts
```

## 结论

截至 2026-03-25，当前仓库已经具备一套独立的 `grok-4.2` 文本 provider 能力线。

现在你可以：

- 单独实例化 Grok provider
- 在不动 Gemini provider 的前提下接业务
- 为下一步的 Gemini -> Grok fallback 策略做准备
