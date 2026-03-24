# 01 Premise To Master Plot Guide

## 目标

实现项目的第一个正式生成环节：

`用户简短创意 -> 总剧情`

这个环节的目标不是直接生成分镜，而是产出一个可审核、可修改、可作为后续角色设定与分镜输入的项目级总剧情。

## 上游依赖

这个阶段只依赖项目的创意输入，不依赖其它 AI 产物。

### 必需输入

- `premiseText`

### 可选输入

- `styleHint`
- `genreHint`
- `targetDurationSec`
- `audienceHint`

## AI 提供方

- `文字 API`

当前只需要约定“这是一个文本生成请求”，不需要在这篇 Guide 里定义更细的 provider 抽象。

## Prompt 模板

### 模板职责

该模板负责把短创意扩写成完整短篇剧情，并尽量补齐以下信息：

- 主题和核心冲突
- 主要角色
- 起承转合
- 情绪走向
- 结尾落点
- 与目标时长相匹配的节奏

### 模板标识

建议模板 key：

`master_plot.generate`

### 模板变量

建议变量结构：

```ts
type MasterPlotPromptVars = {
  premiseText: string;
  styleHint?: string;
  genreHint?: string;
  targetDurationSec?: number;
  audienceHint?: string;
};
```

### 模板资产要求

至少保存：

- 模板正文
- 本次渲染变量
- 渲染后的 prompt 文本

当前只需要支持“系统默认模板 + 项目级覆写模板”。

## 输入结构

项目创建阶段会先写入 premise 文件；本环节创建任务时，实际从项目当前 premise 中读取输入。

项目输入对象可以表示为：

```ts
type ProjectPremiseInput = {
  premiseText: string;
  styleHint?: string;
  genreHint?: string;
  targetDurationSec?: number;
  audienceHint?: string;
};
```

当前代码中的任务输入更接近：

```ts
type MasterPlotGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "master_plot_generate";
  premiseText: string;
  promptTemplateKey: "master_plot.generate";
};
```

## 输出结构

这个阶段输出一个项目级文本资产：`master_plot`

建议结构：

```ts
type MasterPlotArtifact = {
  title?: string;
  logline: string;
  synopsis: string;
  mainCharacters: string[];
  coreConflict: string;
  emotionalArc: string;
  endingBeat: string;
  targetDurationSec?: number;
};
```

要求：

- 这个结构必须稳定，供后续 `character_sheets` 和 `storyboard` 阶段引用
- 即使某些字段为空，也要保持对象结构完整
- 不要在这个阶段直接混入分镜级字段

## 存储与审核点

### 建议存储内容

1. 项目原始创意输入
2. Prompt 模板正文
3. Prompt 变量快照
4. 渲染后的 prompt
5. 文字 API 原始响应
6. 解析后的 `MasterPlotArtifact`
7. 人工修改后的版本

### 建议文件路径

```text
<workspace>/
  prompt-templates/
    master_plot.generate.txt

  .local-data/projects/<project-id>-<slug>/
    premise/
      v1.md

    master-plot/
      current.json
      current.md

    prompt-templates/
      master_plot.generate.txt

  tasks/
    <task-id>/
      input.json
      output.json
      log.txt
      prompt-snapshot.json
      raw-response.txt
```

说明：

- 全局默认模板位于 `prompt-templates/master_plot.generate.txt`
- 项目级覆写模板位于 `.local-data/projects/<project>/prompt-templates/master_plot.generate.txt`
- 当前实现保存的是 `master-plot/current.json` 与 `master-plot/current.md`

### 审核点

这个阶段必须支持以下动作：

- 查看 AI 生成结果
- 人工修改并保存
- 审核通过
- 拒绝并重新生成

只有当 `master_plot` 被审核通过后，当前代码中的直接下游阶段才允许启动：

- `master_plot -> character_sheets`

补充说明：

- `storyboard` 也消费当前已审核的 `master_plot`
- 但在当前仓库中，`storyboard` 还要求 `character_sheets` 全部审核通过后才能启动

## 本阶段暂不处理的内容

当前这篇 Guide 不展开这些内容：

- 数据库表设计
- 完整任务状态机
- 模板编辑器 UI
- 多模型切换
- 自动拆段或自动进入下一阶段
- 将 `master_plot` 再拆成单独的 `outline` 阶段

这篇文档只用于把第一个环节做出来，并把输入、输出、存储、审核边界锁定住。
