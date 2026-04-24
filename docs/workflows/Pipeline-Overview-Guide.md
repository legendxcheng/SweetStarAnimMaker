# Pipeline Overview Guide

## 目标

这份 Guide 只用于定义当前版本的业务流水线，并与当前仓库要落地的实现保持一致，不展开数据库、服务分层、完整状态机等系统设计。

当前目标是把项目拆成一系列可独立实现、可审核、可回溯的阶段，然后按阶段一个一个落地。

本文描述的是 `2026-04-21` 当前主链路约定。

## 项目定义

- 一个 `Project` 对应一个短篇视频片段项目
- 项目起点不是完整剧本，而是一段简短创意
- 每一个正式生成阶段都必须经过人工审核后，才能进入下一个阶段
- `final_cut` 当前是导出资产阶段，不额外引入项目级 `final_cut_*` 状态

## 当前仓库对齐说明

当前业务主链路按以下顺序对齐到 Seedance 视频工作流：

1. 创意输入
2. 总剧情生成
3. 角色设定/角色图生成
4. 场景设定/场景图生成
5. 分镜文案生成
6. 镜头脚本生成与审核
7. 出图生成与审核
8. 视频 prompt 生成、人工编辑、Seedance 片段生成与审核
9. 成片/导出

其中第 4 步 `scene_sheets` 是本次新增的正式阶段：

- 它是“项目级核心场景库”，不是按 `segment` 逐段生成
- 每个 `scene_sheet` 只生成 `1` 张主场景图，作为稳定场景锚点
- 它的职责类似 `character_sheet`
  - `character_sheet` 锁定“谁在演”
  - `scene_sheet` 锁定“人在哪里演”
- `storyboard` 只能消费已审核 `scene_sheets`
- 但 `storyboard segment` 不强制必须绑定某个 `scene_sheet`
  - 有些段落可以直接落在纯黑、纯白、抽象空间或一次性临时场景中

第 6 步 `shot_script` 已按 `segment-first` 语义落地：

- `storyboard` 仍然是上游叙事资产
- `shot_script` 以 `segment` 为生成和审核原子单位
- `1 segment -> N shots`
- 每个 `segment` 单独请求一次文字模型生成
- 每个 `segment` 可以单独保存、重生成、审核通过
- 同时提供“全部通过”动作，把整份 `shot_script` 作为阶段结果收口

第 7 步 `images` 也按 `segment-first` 语义维护：

- 基于已审核 `shot_script` 创建项目级 image batch
- 每个 `segment` 只生成并维护 `startFrame`，必要时补充可选的 `endFrame`
- 当前图片阶段不再为 `segment` 下的每个 `shot` 单独保留一帧输出结构
- 支持按段重生成、按段审核和全部通过
- 项目进入 `images_approved` 后才允许启动视频阶段

第 8 步 `videos` 已正式接入 Seedance 工作流：

- `videos_generate` 只初始化视频批次和 segment 记录，不直接调用 Seedance
- worker 为每个 `segment` 生成 `segment_video_prompt_generate` 子任务
- prompt 生成完成后，segment 进入 `in_review`
- Studio 支持人工编辑 prompt、参考图、参考音频和重新生成 prompt
- 用户对单个 segment 点击生成视频后，才创建 `segment_video_generate` 任务
- worker 通过 Seedance provider 生成视频，下载结果并写回本地存储与 SQLite
- 所有 segment 视频审核通过后，项目进入 `videos_approved`

第 9 步 `final_cut` 已有最小导出实现：

- `POST /projects/:projectId/final-cut/generate` 创建 `final_cut_generate` 任务
- 该任务要求当前视频批次下所有 segment 都是 `approved` 且有 `videoAssetPath`
- worker 按 segment 顺序生成 ffmpeg manifest 并渲染最终视频
- 当前不会把项目状态推进到新的 `final_cut_*` 状态

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
- `场景设定/场景图生成`
  - 基于已审核的 `master_plot` 和已审核的 `character_sheets` 提炼项目级核心场景
  - 一次通常生成多个核心场景，而不是只生成一张总场景图
  - 场景列表必须从当前剧情文本中提炼，不能退化成对所有项目都固定复用的硬编码场景模板
  - 若剧情中存在多个可复用环境节点，应拆成多条 `scene_sheet`，例如“都市办公区 / 仪式空间 / 财团大厅”
  - 为每个核心场景生成可编辑的场景 prompt、场景约束和当前场景图
  - 场景图片 prompt 应只描述场景本身，不混入剧情讲述、镜头调度或角色表演说明
  - 每个 `scene_sheet` 只维护一张主场景图，不做多视角场景包
  - 在场景图尚未实际生成成功前，`imageAssetPath` 可以为空
  - Studio 在这种情况下应显示“生成中/暂无场景图”占位，而不是预先请求一个尚不存在的 `current.png`
  - Studio 支持逐个场景查看、直接修改 prompt 文本、保存后重生成，或直接用当前编辑文本重生成
  - 支持逐个场景审核
  - 只有全部核心场景审核通过后，项目才允许进入 `storyboard`
- `分镜文案生成`
  - 基于已审核的 `master_plot`、`character_sheets` 和 `scene_sheets` 生成项目级分镜文案
  - `scene_sheets` 作为项目级核心场景资产库提供稳定环境参考
  - `storyboard segment` 可以引用已有 `scene_sheet`，也可以不引用
- `镜头脚本`
  - 基于已审核的 `storyboard` 生成项目级 `shot_script`
  - 当前采用 `segment-first` 结构，而不是整份一次性平铺生成
  - 批量启动时先创建一份 `shot_script shell`
  - 然后对每个 `storyboard segment` 单独发起一次生成任务
  - 支持查看当前镜头脚本、按段人工修改、按段重生成、按段审核通过、全部通过
- `出图`
  - 基于已审核的 `shot_script` 生成项目级 `images batch`
  - 当前采用 `segment-first` 结构，每个 `segment` 只维护 `startFrame` 和可选 `endFrame` 两张关键画面
  - 关键画面 prompt 生成时，应综合当前 `segment` 下的 `shots`、`storyboard`、`character_sheets` 和 `scene_sheets`，先解析“当前相关人物”和“当前相关场景”，不能只抽人物不抽场景
  - 人物信息用于锁定角色外观与表演主体，场景信息用于锁定环境空间、关键陈设、光线氛围和空间关系
  - 如某段属于核心场景，生成时应优先注入对应已审核 `scene_sheet`
  - 如某段没有可复用 `scene_sheet`，也应从当前 `storyboard` / `shot_script` 文案中提炼临时场景描述，而不是让画面 prompt 只剩人物描述
  - Studio 顶部按钮应显示“重新生成余下的帧”，用于补跑所有已完成 prompt 规划但尚未完成出图的帧，不影响已完成帧
  - 支持查看当前画面、按段重生成、按段审核通过、全部通过
- `视频片段`
  - 基于已审核的 `images batch` 和 `shot_script` 初始化项目级 `video batch`
  - 当前采用 `segment-first` 视频记录，一个 `segment` 对应一条当前视频记录
  - 初始化阶段自动收集 segment 下 shots 的参考图，并创建 prompt 生成任务
  - prompt 生成与视频生成是两个独立 worker 阶段
  - Studio 允许先审 prompt 和参考素材，再按 segment 手动触发 Seedance 视频生成
  - 支持参考音频、prompt 重生成、单段视频生成、单段审核、全部通过
- `成片/导出`
  - 基于当前已审核的 `video batch` 创建 `final_cut_generate` 任务
  - 当前实现是按 segment 顺序拼接已审核视频片段
  - 生成结果作为 final cut 资产读取，不改变项目状态机

## Scene Sheets 阶段当前语义

`scene_sheets` 不是“把项目里所有场景都提前画一遍”，而是“把值得前置锁定的核心场景正式做成上游资产”。

它的正式语义是：

- `scene_sheets` 是项目级核心场景库
- 只收录值得提前锁定、且后续可能反复复用的核心场景
- 一次 batch 可以包含多个核心场景 `scene_sheet`
- 每个 `scene_sheet` 是一个“单图场景锚点”
- `promptTextCurrent` 应优先写环境空间、时代气质、陈设、材质、光线、天气、色温等场景信息
- 不要求在场景 prompt 中重复剧情、人物动作、镜头语言或分镜说明
- 场景命名与场景拆分应尽量贴合当前项目文本，不应出现与剧情无关的默认场景名
- 输出至少包括：
  - `sceneName`
  - `scenePurpose`
  - `promptTextCurrent`
  - `constraintsText`
  - `imageAssetPath`
  - `status`

也就是说：

- `scene_sheet` 不负责镜头开始状态和结束状态
- `scene_sheet` 不负责多机位覆盖
- `scene_sheet` 只负责给后续阶段一个稳定的环境锚点

## 视频阶段当前语义

当前视频阶段不是“按 shot 直接生成视频”，也不是“初始化时一次性生成所有付费视频”。

真实流程是：

1. `images_approved` 后，API 创建 `videos_generate`
2. worker 创建 `video_batches` 和每个 `segment` 的 `segment_videos` 记录
3. worker 为每个 segment 创建 `segment_video_prompt_generate`
4. prompt 生成后，segment 进入 `in_review`
5. Studio 人工编辑 `promptTextCurrent`、`referenceImages`、`referenceAudios`
6. 用户手动触发单个 segment 的 `segment_video_generate`
7. Seedance provider 生成视频并写回 `current.mp4`、缩略图和元数据
8. segment 审核通过后，全部通过时项目进入 `videos_approved`
9. `videos_approved` 后允许生成 final cut

当前 Seedance adapter 的核心语义是：

- 优先使用 segment 记录里的整组 `referenceImages`
- 只有 `referenceImages` 为空时才 fallback 到 legacy `startFramePath`
- `referenceAudios` 会随请求一起传给 Seedance
- 当前 `referenceImages` 是参考素材集合，不是严格的首帧/尾帧控制模式

当前产品上建议把 segment 视频参考素材理解为一组“有业务语义的参考包”：

- `角色设定参考图` 必选
  - 作用是锁定角色外观、服装、发型、体型和整体人设一致性
- `场景设定图` 可选但优先使用正式 `scene_sheet`
  - 作用是锁定环境空间、时代氛围、关键陈设和场景辨识度
  - 正式来源应优先是已审核 `scene_sheet`
  - 只有当该段没有可复用核心场景时，才临时补充视频阶段场景参考
- `首帧` 必选
  - 作用是锁定当前 segment 的开场构图、动作起点和镜头起势
- `尾帧` 可选
  - 只有当这个 segment 明确需要稳定终态时才补充

也就是说：

- `视频生成最小必需素材 = 角色设定参考图 + 首帧`
- `增强控制素材 = 场景设定图 + 尾帧`
- 当前实现里，这些素材仍统一作为 `referenceImages` 发送给 Seedance
- 但在业务语义、UI 展示、Prompt 描述和人工审核时，必须明确区分：
  - `character_sheet` 锁角色一致性
  - `scene_sheet` 锁环境一致性
  - `start_frame / end_frame` 锁镜头起止连续性

更详细的代码路径和维护说明见：

- `docs/guide/Seedance-Workflow-Code-Guide.md`

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

当前门禁示例：

- `scene_sheets` 只能消费已审核 `character_sheets`
- `storyboard` 只能消费已审核 `scene_sheets`
- `shot_script` 只能消费已审核 `storyboard`
- `images` 只能消费已审核 `shot_script`
- `videos` 只能从 `images_approved` 启动
- `final_cut` 只能消费当前视频批次里全部已审核且有视频资产的 segments

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

### 6. 当前 `images` 已按 segment-first 固定

当前仓库中图片阶段的真实原子单位是：

`1 segment = 1 条 SegmentImageRecord = startFrame + 可选 endFrame`

也就是说：

- 图片批次是项目级
- 当前图片表单和 API 主返回结构都只暴露 `segments[]`
- 每个 `segment` 只保留 `startFrame` 与可选 `endFrame`
- 是否需要 `endFrame` 由该 `segment` 的整体 `frameDependency` 决定
- `segment` 下的 `shots[]` 只作为 prompt 规划和上下文解析输入，不再作为图片阶段主输出结构
- 某段重生成不会强制影响其他段

### 7. 当前 `videos` 已按 segment-first 固定

当前仓库中视频阶段的真实原子单位是：

`1 segment = N shots = 一组参考图/音频 = 一个当前视频片段`

也就是说：

- 视频 prompt 是 segment 级
- 视频配置编辑是 segment 级
- Seedance 生成任务是 segment 级
- 审核通过也是 segment 级
- legacy `shotId` / `shotCode` 等字段仍存在，但不是当前视频阶段的业务原子

### 8. 视频配置变更会使审核失效

如果某个 segment 已经 `approved`，后续修改以下内容会把它打回 `in_review`：

- `promptTextCurrent`
- `referenceImages`
- `referenceAudios`

同时会清空 `approvedAt`。

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
  - 用于总剧情、角色提示词、场景提示词、分镜文案、视频 prompt 规划
- `图片 API`
  - 用于角色图、场景图、segment shots 的参考帧生成
- `视频 API`
  - 当前视频阶段默认接入 Seedance provider
- `导出/渲染器`
  - 当前 final cut 通过 ffmpeg manifest 和 renderer 生成导出资产

当前业务主链路按这些提供方类型设计。具体 provider 选择属于 worker / services 层配置，不应把业务状态逻辑塞进 provider。

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
- Final cut：
  - 保存 manifest
  - 保存导出视频文件
  - 配套一份 `json` 元数据

## 当前代码中的阶段门禁

当前仓库已实现和约定的门禁顺序如下：

- `premise_ready`
  - 允许创建 `master_plot_generate`
- `master_plot_approved`
  - 允许创建 `character_sheets_generate`
- `character_sheets_approved`
  - 允许创建 `scene_sheets_generate`
- `scene_sheets_approved`
  - 允许创建 `storyboard_generate`
- `storyboard_approved`
  - 允许创建 `shot_script_generate`
- `shot_script_approved`
  - 允许创建 `images_generate`
- `images_approved`
  - 允许创建 `videos_generate`
- `videos_approved`
  - 允许创建 `final_cut_generate`

各阶段运行和审核中的项目状态包括：

- `master_plot_generating`
- `master_plot_in_review`
- `character_sheets_generating`
- `character_sheets_in_review`
- `character_sheets_approved`
- `scene_sheets_generating`
- `scene_sheets_in_review`
- `scene_sheets_approved`
- `storyboard_generating`
- `storyboard_in_review`
- `storyboard_approved`
- `shot_script_generating`
- `shot_script_in_review`
- `shot_script_approved`
- `images_generating`
- `images_in_review`
- `images_approved`
- `videos_generating`
- `videos_in_review`
- `videos_approved`

当前没有项目级 `final_cut_generating` / `final_cut_approved` 状态。final cut 的运行状态通过 `final_cut_generate` task 和 final cut read model 表达。

当前代码中已经存在和约定的任务类型包括：

- `master_plot_generate`
- `character_sheets_generate`
- `character_sheet_generate`
- `scene_sheets_generate`
- `scene_sheet_generate`
- `storyboard_generate`
- `shot_script_generate`
- `shot_script_segment_generate`
- `images_generate`
- `image_batch_generate_all_frames`
- `image_batch_regenerate_failed_frames`
  - 当前兼容承载 Studio “重新生成余下的帧”动作，语义是补跑所有未完成出图的帧
- `image_batch_regenerate_all_prompts`
- `image_batch_regenerate_failed_prompts`
- `frame_prompt_generate`
- `frame_image_generate`
- `videos_generate`
- `segment_video_prompt_generate`
- `segment_video_generate`
- `final_cut_generate`

## 当前文档补齐顺序

当前应按仓库现状补齐和维护 Stage Guide，而不是再按最早版本的理想流水线回推。

当前建议阶段文档顺序为：

- `01-Premise-To-Master-Plot-Guide.md`
- `02-Master-Plot-To-Character-Sheets-Guide.md`
- `03-Character-Sheets-To-Scene-Sheets-Guide.md`
- `04-Scene-Sheets-To-Storyboard-Guide.md`
- `05-Storyboard-To-Shot-Script-Guide.md`
- `06-Shot-Script-To-Images-Guide.md`
- `07-Images-To-Videos-Guide.md`
- `08-Videos-To-Final-Cut-Guide.md`

## 后续开发分流

继续开发时，先判断要改的是哪一层：

- “这是业务规则变化吗？” -> `packages/core`
- “这是 HTTP/前后端契约变化吗？” -> `apps/api` + `packages/shared` + `apps/studio`
- “这是 Seedance 请求协议变化吗？” -> `packages/services`
- “这是数据落盘/版本保留变化吗？” -> `packages/services/src/storage`
- “这是按钮和交互变化吗？” -> `apps/studio`
- “这是最终拼接/导出变化吗？” -> `packages/core` final cut use case + renderer/storage + `apps/studio`

## 结论

当前主链路已经从 `premise_ready` 贯通到 `videos_approved`，并具备最小 final cut 导出能力。

现在最重要的维护原则是：

- `scene_sheets` 是正式上游阶段，不是视频阶段临时补的一张环境图
- `shot_script`、`images`、`videos` 都按 `segment-first` 语义理解
- `videos_generate` 负责初始化批次与 prompt 准备，不直接生成所有视频
- `segment_video_generate` 才是真正调用 Seedance 的阶段
- `final_cut_generate` 消费已审核视频片段并生成导出资产，不扩展项目状态机
- provider 只处理外部协议适配，业务状态和审核规则应留在 `packages/core`
