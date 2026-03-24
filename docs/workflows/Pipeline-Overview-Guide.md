# Pipeline Overview Guide

## 目标

这份 Guide 只用于定义当前版本的业务流水线，并与当前代码仓库的实现保持一致，不展开数据库、服务分层、完整状态机等系统设计。

当前目标是把项目拆成一系列可独立实现、可审核、可回溯的阶段，然后按阶段一个一个落地。

## 项目定义

- 一个 `Project` 对应一个短篇视频片段项目
- 项目起点不是完整剧本，而是一段简短创意
- 每一个阶段都必须经过人工审核后，才能进入下一个阶段

## 当前仓库对齐说明

截至当前仓库实现，业务主链路已经不是最初设想的细粒度流水线，而是一条先跑通并已落地到 `shot_script` 的简化流水线。

当前代码已经实现到：

1. 创意输入
2. 总剧情生成
3. 角色设定/角色图生成
4. 分镜文案生成
5. 镜头脚本生成与审核

其中第 5 步当前已经按新的 segment-first 语义落地：

- `storyboard` 仍然是上游叙事资产
- `shot_script` 以 `segment` 为生成和审核原子单位
- `1 segment -> N shots`
- 每个 `segment` 单独请求一次文字模型生成
- 每个 `segment` 可以单独保存、重生成、审核通过
- 同时提供“全部通过”动作，把整份 `shot_script` 作为阶段结果收口

当前代码尚未实现的后续阶段有：

1. 出图
2. 成片/导出

说明：

- `image` 阶段的设计文档已经存在，但当前主代码链路尚未接入
- 当前项目详情页主导航中已经不再暴露单独的 `image` 阶段入口
- `final_cut` 仍只处于预留状态，尚无正式实现

最初规划中的这些细粒度阶段，目前仍没有作为独立阶段落地到代码主链路中：

- 情节大纲生成
- 人物设定生成
- 分镜首帧/尾帧生成
- 分镜视频生成

如果后续决定回到更细的阶段划分，需要在现有主链路基础上重新拆分并补充 Stage Guide。

## 当前主流水线

当前仓库对齐后的主流水线如下：

- `创意输入`
  - 用户输入一句或一小段创意，作为项目起点
- `总剧情生成`
  - 用文字 API 将创意扩写为一个完整短篇剧情
- `角色设定/角色图生成`
  - 基于已审核的 `master_plot` 提取主角色列表
  - 为每个角色生成可编辑的角色提示词
  - 为每个角色生成当前角色图，并支持参考图、重生成和逐个审核
- `分镜文案生成`
  - 基于已审核的 `master_plot` 和已审核的 `character_sheets` 生成项目级分镜文案
- `镜头脚本`
  - 基于已审核的 `storyboard` 生成项目级 `shot_script`
  - 当前采用 `segment-first` 结构，而不是整份一次性平铺生成
  - 批量启动时先创建一份 `shot_script shell`
  - 然后对每个 `storyboard segment` 单独发起一次生成任务
  - 支持查看当前镜头脚本、按段人工修改、按段重生成、按段审核通过、全部通过
- `出图`
  - 当前仓库未实现
  - `05-Shot-Script-To-Images-Guide.md` 目前描述的是下一阶段设计目标，不代表代码已接入
- `成片/导出`
  - 当前仓库未实现，仅保留最终阶段占位

## 关键业务规则

### 1. 每一步都审核

每个正式生成环节都必须经过：

1. AI 生成
2. 人工查看
3. 人工修改或要求重生
4. 审核通过
5. 才允许进入下一步

### 2. 下游默认只消费上游已审核结果

新生成但尚未审核的内容，不能直接被下游使用。

### 3. 每个 AI 环节都必须绑定 Prompt 模板

Prompt 不是代码里的临时字符串，而是这个环节的正式资产。

每次任务都至少要保存：

- 使用了哪个模板
- 模板变量输入
- 最终渲染后的 prompt 文本

### 4. 模板采用系统默认 + 项目级覆写

- 系统提供默认模板
- 每个项目可以复制并覆写自己的模板
- 当前先按“阶段级模板”管理，不做单条实例级覆写

### 5. 当前 `shot_script` 已按 segment-first 固定

当前仓库中已经固定采用：

`1 storyboard segment = 1 个 shot_script segment = N 个 shots`

也就是说：

- 生成 `shot_script` 时，不再按“整份脚本一次生成”理解
- 也不再按“一个 storyboard segment = 一个 shot”理解
- `shot_script` 阶段的原子单位是 `segment`

### 6. 后续视频阶段仍按一个 segment 对应一个片段预留

虽然当前仓库还没实现视频阶段，但后续阶段默认预留为：

`一个 segment = 一组 shots = 一张首帧 + 一张尾帧 + 一个视频片段`

并且默认约束：

- 一个 `segment` 的总时长不应超过 `15s`
- 首尾帧逻辑发生在后续视频/出图阶段，而不是当前 `shot_script` 阶段

## 通用实现契约

后续每一个阶段 Guide 都应该至少说明这 7 项：

1. 目标
2. 上游依赖
3. AI 提供方
4. Prompt 模板
5. 输入结构
6. 输出结构
7. 存储与审核点

## 当前约定的 AI 提供方类型

- `文字 API`
  - 用于总剧情、角色提示词、分镜文案
- `图片 API`
  - 用于角色图，以及后续分镜首帧、分镜尾帧
- `视频 API`
  - 用于后续分镜视频片段

当前先按这三类固定提供方设计，不做可插拔抽象层。

## 当前建议的最小存储原则

- 文本类产物：
  - 以结构化 `json` 为主
  - 可选保存一份便于人工阅读的 `md`
- 图片类产物：
  - 保存图片文件
  - 配套一份 `json` 元数据
- 视频类产物：
  - 保存视频文件
  - 配套一份 `json` 元数据
- Prompt：
  - 保存模板正文
  - 保存变量输入快照
  - 保存渲染后的 prompt

## 当前代码中的阶段门禁

当前仓库实际采用的门禁顺序如下：

- `premise_ready`
  - 允许创建 `master_plot_generate`
- `master_plot_approved`
  - 允许创建 `character_sheets_generate`
- `character_sheets_approved`
  - 允许创建 `storyboard_generate`
- `storyboard_approved`
  - 允许创建 `shot_script_generate`

各阶段运行和审核中的状态包括：

- `master_plot_generating`
- `master_plot_in_review`
- `character_sheets_generating`
- `character_sheets_in_review`
- `storyboard_generating`
- `storyboard_in_review`
- `storyboard_approved`
- `shot_script_generating`
- `shot_script_in_review`
- `shot_script_approved`

当前代码中已经存在的任务类型包括：

- `master_plot_generate`
- `character_sheets_generate`
- `character_sheet_generate`
- `storyboard_generate`
- `shot_script_generate`
- `shot_script_segment_generate`

当前代码中还不存在 `images_generate`、`segment_frames_generate` 等后续阶段任务类型。

## 当前文档补齐顺序

当前应按仓库现状补齐和维护 Stage Guide，而不是再按最早版本的理想流水线回推。

当前已存在：

- `01-Premise-To-Master-Plot-Guide.md`
- `04-Storyboard-To-Shot-Script-Guide.md`
- `05-Shot-Script-To-Images-Guide.md`

其中：

- `01` 对应已实现阶段
- `04` 需要继续按当前 segment-first 实现语义维护，旧的“一个 segment = 一个 shot”表述已经不再准确
- `05` 对应下一阶段设计目标，当前尚未落地到主代码链路

建议下一步补齐或更新：

- `02-Master-Plot-To-Character-Sheets-Guide.md`
- `03-Character-Sheets-To-Storyboard-Guide.md`
- `06-Images-To-Final-Cut-Guide.md`
