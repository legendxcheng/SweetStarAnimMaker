# Video Prompt 生成提示词修改指南

## 目的

这份文档说明如何修改 SweetStarAnimMaker 在 video 阶段里使用的“生成 VideoPrompt 的 Prompt”。

这里说的不是：

- 前端按钮文案
- 最终发给 Kling Omni 的 HTTP payload
- `sound` 开关本身

这里说的是：

- 系统先把 shot script、首尾帧信息、对白/音频约束喂给 Gemini
- Gemini 生成一个结构化 prompt plan
- 其中的 `finalPrompt` 再被写入 video 记录，并在后续真正发给视频模型

如果你要调整“VideoPrompt 应该怎么写”，优先改本文提到的 provider 提示词，而不是先去改 Kling 请求层。

## 先分清 3 层

video 阶段和 prompt 相关的内容，当前要分清下面三层：

### 1. Prompt 生成层

入口文件：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`

这一层负责：

- 给 Gemini 一段中文说明
- 要求 Gemini 输出结构化 JSON
- 产出 `finalPrompt`、`dialoguePlan`、`audioPlan`、`visualGuardrails`、`rationale`

这是“生成 VideoPrompt 的生成 Prompt”所在位置。

### 2. Prompt 落盘与传递层

关键文件：

- `packages/core/src/use-cases/build-video-prompt-provider-input.ts`
- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-generate-task.ts`

这一层负责：

- 把 shot script 字段整理成 `GenerateVideoPromptInput`
- 调用 `videoPromptProvider.generateVideoPrompt(...)`
- 把返回的 `finalPrompt` 写入 segment 的 `promptTextSeed` / `promptTextCurrent`
- 在真正发视频任务时，把 `promptTextCurrent` 作为 prompt 发送给视频 provider

### 3. 视频 provider 请求层

例如：

- `packages/services/src/providers/kling-omni-provider.ts`

这一层负责：

- 把 `finalPrompt` 包装成上游 API 请求
- 带上首帧/尾帧、时长、模型名等参数
- 提交给 VectorEngine / Kling

这层只决定“怎么发”，不决定“finalPrompt 应该怎么措辞”。

## 当前真实链路

当前 video prompt 生成链路大致如下：

1. shot script 已经产出 `dialogue`、`os`、`audio`、`continuityNotes` 等字段
2. `build-video-prompt-provider-input.ts` 将这些字段整理为 `GenerateVideoPromptInput`
3. `gemini-video-prompt-provider.ts` 里的 `buildPromptText(...)` 生成给 Gemini 的提示词
4. Gemini 返回 JSON
5. `normalizeVideoPromptPayload(...)` 读取 `finalPrompt`
6. 系统再追加硬性语音约束和声音约束
7. `process-segment-video-prompt-generate-task.ts` 把 `finalPrompt` 写入当前 segment
8. `process-segment-video-generate-task.ts` 读取 `promptTextCurrent`
9. Kling Omni provider 用这个 `promptTextCurrent` 发起真正的视频生成

如果你改的是 video prompt 的写法，最该看的不是第 8、9 步，而是第 3、5、6 步。

## 最核心入口

主入口文件：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`

这个文件里最重要的编辑点有 4 个。

### 1. `buildPromptText(input)`

职责：

- 构造发给 Gemini 的主提示词
- 告诉 Gemini 必须输出哪些字段
- 告诉 Gemini `finalPrompt` 应该长成什么样
- 把当前镜头的对白、旁白、环境声、首尾帧约束都写进去

这是最常改的地方。

如果你要改变以下行为，通常先改这里：

- `finalPrompt` 的整体写法
- 是否要求必须写出对白主体
- 是否要求显式区分对白 / 旁白 / 环境声
- 是否强调单镜头连续性
- 是否允许或禁止背景音乐

### 2. `buildDialoguePlan(input)`

职责：

- 根据 shot script 的 `dialogue` 和 `os` 生成确定性的语音约束
- 在 Gemini 没写清时，系统仍然能补一段稳定的“语音约束”

适合修改的场景：

- 你想调整“无对白/无旁白/无语音”的标准表达
- 你想更严格地要求口型
- 你想把对白和旁白的约束写得更机械、更不可歧义

### 3. `buildAudioPlan(input)`

职责：

- 根据 shot script 的 `audio` 生成确定性的声音规划
- 对“必须有可听音轨”“不要额外补声音”之类的规则做兜底

适合修改的场景：

- 你想强化环境声存在感
- 你想禁止模型补额外音效
- 你想明确“无 BGM 不等于无音轨”

### 4. `buildFinalPromptAudioConstraint(input)`

职责：

- 给最终 `finalPrompt` 追加一段硬性声音约束
- 避免 Gemini 自由发挥后把音频意图写偏

适合修改的场景：

- 你需要把某个声音规则直接钉死到最终 prompt
- 你怀疑模型把“无配乐”误解成“静音”

## 当前这个问题为什么应改 Prompt，而不是先改 `sound`

这次排查的关键结论是：

- Kling Omni 请求层已经带了 `sound: "on"`
- 旧样本视频文件里也确实存在 AAC 音轨

也就是说，问题更像是：

- prompt 对声音意图描述得不够清楚
- “无背景音乐、无BGM、无配乐” 可能被模型误解成 “不要声音” 或 “尽量静音”

因此修复重点应该是：

- 明确禁止背景音乐
- 同时明确要求必须输出可听音轨
- 保留环境声、拟音、对白、旁白
- 明确禁止静音或无声成片

而不是把修复方向放在：

- 前端播放器是否静音
- payload 是否有 `sound`

## 当前推荐写法

关于音频约束，建议遵循下面这个模式：

1. 先明确“必须输出可听音轨”
2. 再明确“禁止静音或无声成片”
3. 再明确“无背景音乐、无BGM、无配乐”
4. 最后明确“仍然保留已提供的环境声、拟音、对白或旁白”

推荐语义应当是：

- 不要背景音乐
- 但要有声音
- 声音来源必须以已提供内容为准
- 不要新增未提供的人声或额外配乐

不推荐只写这种表达：

- 无背景音乐
- 无BGM
- 无配乐

因为单独这样写时，容易让模型把“不要配乐”扩展理解成“整个片段应该尽量安静甚至无声”。

## 这次修正的关键思路

当前建议保留下面这类硬性约束思路：

- `必须输出可听音轨，不允许静音或无声成片。`
- `即使不要背景音乐、BGM、配乐，也必须保留已提供的环境声、拟音、对白或旁白。`
- `无背景音乐、无BGM、无配乐。`

这三句组合起来，语义比较稳定：

- 禁止配乐
- 不禁止声音
- 声音内容必须围绕已提供素材

## 修改时优先顺序

建议按下面顺序改，而不是一上来大改所有地方。

### 情况 1：你想改变 Gemini 的理解方向

先改：

- `buildPromptText(...)`

原因：

- 这是最上游的意图注入点
- 它决定 Gemini 产出的 `finalPrompt` 基线怎么写

### 情况 2：你想增加系统兜底，防止 Gemini 写偏

再改：

- `buildDialoguePlan(...)`
- `buildAudioPlan(...)`
- `buildFinalPromptAudioConstraint(...)`

原因：

- 这几个函数是 deterministic 兜底
- 即使 Gemini 返回的 plan 有瑕疵，系统也能把关键约束补回去

### 情况 3：你怀疑是请求层参数问题

最后才看：

- `packages/services/src/providers/kling-omni-provider.ts`

只有当你确认 `finalPrompt` 本身没问题，才值得继续怀疑 payload 字段。

## 建议不要改的地方

以下位置通常不是“修改 VideoPrompt 写法”的第一落点：

- `apps/studio/src/components/video-phase-panel.tsx`
- 视频播放组件
- `process-segment-video-generate-task.ts` 的普通调度逻辑

这些位置可能影响显示、触发和排查，但不决定最终 prompt 的语义结构。

## 修改后如何验证

最直接的验证入口：

- `packages/services/tests/gemini-video-prompt-provider.test.ts`

改完后，至少确认下面几类断言仍然成立：

- `finalPrompt` 里仍然有 `<<<image_1>>>`
- `finalPrompt` 里仍然会追加 `语音约束：...`
- `finalPrompt` 里仍然会追加 `声音约束：...`
- `audioPlan` 里明确写出“必须输出可听音轨”
- “无BGM” 不会变成 “无音轨”

运行命令：

```powershell
cd packages/services
.\node_modules\.bin\vitest.CMD run tests\gemini-video-prompt-provider.test.ts
```

如果你改动了 prompt 输入结构或任务链路，建议再补看：

- `packages/core/tests/process-segment-video-prompt-generate-task.test.ts`
- `packages/core/tests/process-segment-video-generate-task.test.ts`

## 运行时排查建议

如果你怀疑改动没有生效，按下面顺序查。

### 1. 看 video prompt plan 是否已生成

优先检查对应 task 输出和 segment 当前记录，确认：

- `finalPrompt` 是否已经更新
- `dialoguePlan` / `audioPlan` 是否符合预期

### 2. 看真正发视频时使用的 prompt

`process-segment-video-generate-task.ts` 会把 `promptTextCurrent` 写到 `prompt-snapshot.json`。

排查时不要只看 Gemini 原始返回，而要看真正进入视频生成阶段的 prompt snapshot。

### 3. 再看 provider payload

如果最终 prompt 看起来已经正确，再确认实际请求是否带了：

- `sound: "on"`

如果这里也没问题，再去判断是不是模型对 prompt 的语义理解仍然不稳定。

## 一条实用原则

以后遇到“视频没声音”这类问题，先按这个顺序判断：

1. payload 有没有把声音能力打开
2. 最终视频文件是否真的没有音轨
3. finalPrompt 是否把“无BGM”误写成了“接近无声”
4. shot script 的 `audio` / `dialogue` / `os` 是否本来就过弱或过空

如果第 1、2 项都没问题，通常优先回到 video prompt 生成提示词去修。

## 相关文件索引

核心入口：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`

上游输入整理：

- `packages/core/src/use-cases/build-video-prompt-provider-input.ts`

video prompt 生成任务：

- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`

真正发视频任务：

- `packages/core/src/use-cases/process-segment-video-generate-task.ts`

Kling Omni provider：

- `packages/services/src/providers/kling-omni-provider.ts`

测试：

- `packages/services/tests/gemini-video-prompt-provider.test.ts`

## 结论

如果你的目标是“修改 video 阶段最终 prompt 的生成逻辑”，请优先改：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`

尤其先看：

- `buildPromptText(...)`
- `buildDialoguePlan(...)`
- `buildAudioPlan(...)`
- `buildFinalPromptAudioConstraint(...)`

最重要的一条经验是：

- “无背景音乐、无BGM、无配乐” 不能单独出现
- 必须同时明确“要有可听音轨，不能静音”

这样才能避免模型把“不要配乐”误解成“不要声音”。
