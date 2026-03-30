# 各生产环节 Prompt 修改位置速查

## 目的

这份文档只回答一件事：

- **每一个生产环节，Prompt 应该去哪里改**

如果你只想快速定位文件，直接看下面的表。

---

## 总表

| 环节 | 优先修改位置 | 备注 |
| --- | --- | --- |
| MasterPlot | `prompt-templates/master_plot.generate.txt` | 模板驱动 |
| 分镜 Storyboard | `prompt-templates/storyboard.generate.txt` | 模板驱动 |
| 镜头脚本 Shot Script | `prompt-templates/shot_script.segment.generate.txt` | 当前主路径优先改这个 |
| 角色设定 Prompt | `prompt-templates/character_sheet.prompt.generate.txt` | 生成角色外观描述 |
| 角色三视图出图 Prompt | `prompt-templates/character_sheet.turnaround.generate.txt` | 直接给角色图出图使用 |
| 画面 Frame Prompt | `packages/services/src/providers/frame-prompt-template.ts` | 当前主链路优先改代码，不是先改模板 |
| 视频 Video Prompt | `packages/services/src/providers/gemini-video-prompt-provider.ts` | 当前主链路优先改代码，不是先改模板 |

---

## 1. MasterPlot 在哪里改

优先改这里：

- `prompt-templates/master_plot.generate.txt`

相关流程入口：

- `packages/core/src/use-cases/process-master-plot-generate-task.ts`

如果项目已经有项目级副本，也可能实际读取这里：

- `.local-data/projects/<project>/prompt-templates/master_plot.generate.txt`

---

## 2. 分镜 Storyboard 在哪里改

优先改这里：

- `prompt-templates/storyboard.generate.txt`

相关流程入口：

- `packages/core/src/use-cases/process-storyboard-generate-task.ts`

如果项目已经有项目级副本，也可能实际读取这里：

- `.local-data/projects/<project>/prompts/storyboard/project/active.template.txt`

---

## 3. 镜头脚本 Shot Script 在哪里改

当前主路径优先改这里：

- `prompt-templates/shot_script.segment.generate.txt`

相关流程入口：

- `packages/core/src/use-cases/process-shot-script-segment-generate-task.ts`
- `packages/core/src/use-cases/process-shot-script-generate-task.ts`

Provider 代码在这里：

- `packages/services/src/providers/gemini-shot-script-provider.ts`

如果项目已经有项目级副本，也可能实际读取这里：

- `.local-data/projects/<project>/prompt-templates/shot_script.segment.generate.txt`

补充：

- `prompt-templates/shot_script.generate.txt` 也存在
- 但日常维护时，优先看 `shot_script.segment.generate.txt`

---

## 4. 角色设定 Prompt 在哪里改

优先改这里：

- `prompt-templates/character_sheet.prompt.generate.txt`

相关流程入口：

- `packages/core/src/use-cases/process-character-sheets-generate-task.ts`

如果项目已经有项目级副本，也可能实际读取这里：

- `.local-data/projects/<project>/prompts/character-sheet/prompt/project/active.template.txt`

---

## 5. 角色三视图出图 Prompt 在哪里改

优先改这里：

- `prompt-templates/character_sheet.turnaround.generate.txt`

相关流程入口：

- `packages/core/src/use-cases/process-character-sheet-generate-task.ts`

如果项目已经有项目级副本，也可能实际读取这里：

- `.local-data/projects/<project>/prompts/character-sheet/turnaround/project/active.template.txt`

---

## 6. 画面 Frame Prompt 在哪里改

当前主链路优先改这里：

- `packages/services/src/providers/frame-prompt-template.ts`

关键函数：

- `buildFramePromptText(...)`

相关流程入口：

- `packages/services/src/providers/gemini-frame-prompt-provider.ts`
- `packages/core/src/use-cases/process-frame-prompt-generate-task.ts`

注意：

- `prompt-templates/segment_frame.plan.generate.txt` 虽然存在
- **但当前主链路不是优先改它**

---

## 7. 视频 Video Prompt 在哪里改

当前主链路优先改这里：

- `packages/services/src/providers/gemini-video-prompt-provider.ts`

重点函数：

- `buildPromptText(...)`
- `buildDialoguePlan(...)`
- `buildAudioPlan(...)`
- `buildFinalPromptAudioConstraint(...)`

相关流程入口：

- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-generate-task.ts`

注意：

- `prompt-templates/segment_video.generate.txt` 虽然存在
- **但当前主链路不是优先改它**

---

## 最后只记这 2 句

- **MasterPlot / 分镜 / 镜头脚本 / 角色设定：先改 `prompt-templates/`**
- **画面 / 视频：先改 `packages/services/src/providers/` 里的 Prompt 生成代码**

