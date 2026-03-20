# Prompt 模板机制使用指南

## 目的

这份文档说明 SweetStarAnimMaker 当前的 Prompt 模板机制怎么工作、模板文件放在哪里、项目级覆盖怎么生效，以及日常修改和排查时应该看哪些文件。

本文基于当前仓库实现整理，时间点为 2026-03-20。

## 当前支持范围

当前仓库只落地了一个 prompt key：

- `master_plot.generate`

它用于 `Premise -> Master Plot` 这一阶段的生成。

当前还没有通用的多模板注册系统，也没有更复杂的变量渲染器。现阶段只支持把模板文本中的：

```text
{{premiseText}}
```

替换为项目当前任务输入里的 premise 内容。

## 机制概览

当前机制分成两层：

1. 仓库级全局模板
2. 项目级模板副本

运行时规则是：

1. 创建项目时，从仓库级模板复制一份到该项目目录
2. 任务执行时，优先读取项目级模板
3. 如果项目级模板不存在，则回退到仓库级模板
4. 如果两边都不存在，则任务失败并报错

这意味着：

- 你可以通过修改仓库根目录模板来更新“默认行为”
- 你也可以只修改某个项目自己的模板，而不影响其他项目

## 文件位置

### 1. 仓库级全局模板

当前全局模板文件位于：

- `prompt-templates/master_plot.generate.txt`

这是默认模板的唯一真实来源。

### 2. 项目级模板副本

项目创建后，会在项目本地数据目录下生成一份副本：

```text
.local-data/projects/<project-storage-dir>/prompt-templates/master_plot.generate.txt
```

例如：

```text
.local-data/projects/proj_20260317_ab12cd-my-story/prompt-templates/master_plot.generate.txt
```

### 3. 任务执行产物

当 `master_plot_generate` 任务运行后，和 prompt 相关的几个关键文件通常在这里：

```text
.local-data/projects/<project>/tasks/<task-id>/prompt-snapshot.json
.local-data/projects/<project>/tasks/<task-id>/raw-response.txt
.local-data/projects/<project>/master-plot/current.json
.local-data/projects/<project>/master-plot/current.md
```

它们分别用于：

- `prompt-snapshot.json`：记录实际发送给模型的渲染后 prompt 和变量
- `raw-response.txt`：记录 provider 的原始返回
- `master-plot/current.json`：当前 master plot 的结构化结果
- `master-plot/current.md`：当前 master plot 的 Markdown 视图

## 创建项目时会发生什么

创建项目时，后端会做两件和 prompt 相关的事：

1. 写入 premise 文件
2. 初始化该项目的 prompt 模板文件

初始化不是写死代码里的默认字符串，而是把仓库级模板：

- `prompt-templates/master_plot.generate.txt`

复制到项目目录：

- `.local-data/.../prompt-templates/master_plot.generate.txt`

所以新项目一创建，就有一份自己可编辑的模板副本。

## 任务执行时怎么选模板

`master_plot_generate` 任务执行时，会读取 `promptTemplateKey = "master_plot.generate"` 对应的模板。

读取顺序如下：

1. 先读项目级模板文件
2. 读不到时，再读仓库级模板文件
3. 如果全局模板也不存在，抛出错误：

```text
Prompt template not found: master_plot.generate
```

这个设计保证两件事同时成立：

- 正常项目可以拥有独立模板
- 老项目或被手动删掉项目模板的项目，仍然能靠全局模板跑通

## 模板变量怎么写

当前只有一个已实现变量：

```text
{{premiseText}}
```

当前模板示例：

```text
You are developing a short-form animated story concept from a single premise.

Turn the premise below into one cohesive master plot for a short film or episode concept.

Requirements:
- Keep the story focused on one clear protagonist journey.
- Preserve the premise's strongest emotional hook.
- Establish a concrete external conflict and an internal emotional change.
- Aim for a story that can plausibly fit into a concise animated production.
- Prefer vivid, filmable story beats over abstract themes.
- Do not add production notes, formatting markup, or multiple alternatives.

Premise:
{{premiseText}}
```

渲染规则目前非常简单：

- 只是字符串替换
- 不支持条件语句
- 不支持循环
- 不支持额外 helper

所以模板编辑时最好保持朴素文本结构，不要把它当成复杂模板引擎来用。

## 常见使用方式

### 方式 1：修改全局默认模板

适合：

- 你想让之后新建项目默认都使用新的写法
- 你想统一调整团队的 master plot 提示词基线

做法：

1. 编辑 `prompt-templates/master_plot.generate.txt`
2. 新建项目，或让旧项目删除自己的项目级模板后使用回退

注意：

- 已经存在的项目不会自动同步全局模板变更
- 旧项目如果已经有自己的模板副本，运行时仍会优先读项目副本

### 方式 2：只覆盖单个项目

适合：

- 某个项目的题材、风格、节奏要求明显不同
- 你想做 prompt 实验但不影响其他项目

做法：

1. 找到该项目的模板文件
2. 直接编辑：

```text
.local-data/projects/<project>/prompt-templates/master_plot.generate.txt
```

下次该项目再跑 `master_plot_generate` 时，就会优先使用这份项目级模板。

### 方式 3：强制某个项目回退到全局模板

适合：

- 项目级模板被改乱了
- 你想快速恢复到全局默认写法

做法：

1. 删除该项目下的：

```text
.local-data/projects/<project>/prompt-templates/master_plot.generate.txt
```

2. 再次触发 `master_plot_generate`

此时运行时会自动回退到：

- `prompt-templates/master_plot.generate.txt`

## 怎么确认实际发给模型的 prompt

不要只看模板文件本身，应该看任务产物里的：

- `prompt-snapshot.json`

这个文件记录的是“渲染后的最终 prompt”，也就是已经把 `{{premiseText}}` 替换进去之后真正传给模型的文本。

排查时建议按这个顺序看：

1. 看项目模板文件是否是你期望的内容
2. 看 `prompt-snapshot.json` 是否已经按预期渲染
3. 看 `raw-response.txt` 判断模型输出是否符合模板意图
4. 看 `master-plot/current.json` 判断结构化结果是否正确入库和落盘

## 什么时候应该修改全局模板，什么时候改项目模板

建议规则：

- 改全局模板：这是默认基线应该怎样写
- 改项目模板：这个项目需要特殊处理

如果你不确定，优先改项目模板。这样风险更小，不会影响其他项目。

## 常见问题

### 1. 我改了 `prompt-templates/master_plot.generate.txt`，为什么现有项目没变化？

因为现有项目通常已经有自己的副本文件。运行时优先读项目级模板，不会自动覆盖。

### 2. 我想让某个旧项目吃到最新全局模板，怎么做？

最简单的方式是：

1. 备份旧项目模板
2. 删除项目级模板文件
3. 重新触发生成，让它回退到全局模板

如果你明确要“复制最新全局模板覆盖项目模板”，也可以手工复制过去。

### 3. 如果全局模板文件被删掉会怎样？

如果项目级模板存在，任务仍然可以跑。

如果项目级模板也不存在，任务会失败，并出现错误：

```text
Prompt template not found: master_plot.generate
```

### 4. 当前是否支持多个 prompt key？

不支持通用化扩展流程。当前实现只覆盖了：

- `master_plot.generate`

如果后面要支持第二个 prompt 文件，需要补充对应 key、测试和文档。

## 推荐排查清单

当你怀疑 prompt 模板没生效时，优先检查：

1. 仓库根目录的全局模板文件是否存在
2. 目标项目目录下是否已有项目级模板
3. 任务实际使用的是不是你刚改过的那个文件
4. `prompt-snapshot.json` 里的最终文本是不是你想要的
5. 模型输出问题到底是 prompt 问题，还是 provider / 模型本身的问题

## 相关实现位置

如果你要继续开发这套机制，优先看这几个文件：

- `prompt-templates/master_plot.generate.txt`
- `packages/services/src/storage/local-data-paths.ts`
- `packages/services/src/storage/storyboard-storage.ts`
- `packages/core/src/use-cases/create-project.ts`
- `packages/core/src/use-cases/process-storyboard-generate-task.ts`

## 结论

当前项目的 prompt 模板机制已经具备最小可用闭环：

- 有仓库级默认模板
- 有项目级可覆盖副本
- 运行时支持项目优先、全局回退
- 能通过 `prompt-snapshot.json` 追踪最终发送给模型的 prompt

对日常使用来说，最重要的原则只有一条：

- 想改默认行为，改仓库根目录模板
- 想只影响单个项目，改项目目录模板
