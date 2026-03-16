# 漫剧自动化制作系统 PRD（Product Requirement Document）

## 1. 项目概述

### 1.1 项目目标

开发一套 **半自动化漫剧制作工具**，通过 AI 辅助生成分镜、图片与视频片段，并结合人工审核完成最终漫剧视频制作。

系统重点目标：

* 提高漫剧生产效率
* 支持 **AI生成 + 人工审核**
* 提供 **清晰的流程化生产 Pipeline**
* 架构可扩展，方便未来接入新的 AI 模型
* 支持二次开发

### 1.2 核心理念

系统设计为 **Human-in-the-loop AI Pipeline**：

AI负责生成内容，人负责审核与调整。

流程中每一步均可：

* 审核
* 修改
* 重新生成
* 回退版本

---

# 2. 用户角色

当前版本仅考虑 **单用户使用**。

未来可扩展：

| 角色  | 说明        |
| --- | --------- |
| 创作者 | 创建项目，输入脚本 |
| 审核者 | 审核AI生成内容  |
| 系统  | 执行AI生成任务  |

---

# 3. 核心流程

## 3.1 总体生产流程

```
输入脚本
    ↓
生成分镜脚本
    ↓
生成分镜图片
    ↓
生成视频片段
    ↓
视频拼接
    ↓
导出最终视频
```

每一步均包含 **人工审核环节**。

---

## 3.2 完整流程（含审核）

```
Script
 ↓
生成分镜脚本
 ↓
人工审核

 ↓
生成分镜图片
 ↓
人工审核

 ↓
生成视频片段
 ↓
人工审核

 ↓
视频拼接
 ↓
导出视频
```

---

# 4. 功能模块

系统包含以下模块：

```
项目管理
Pipeline任务系统
AI生成模块
资产管理
审核系统
视频拼接
```

---

# 5. 功能需求

---

# 5.1 项目管理

## 创建项目

用户可以创建一个漫剧项目。

字段：

| 字段           | 说明   |
| ------------ | ---- |
| Project Name | 项目名称 |
| Script       | 原始脚本 |
| Created Time | 创建时间 |

项目创建后进入 **脚本阶段**。

---

## 项目结构

一个项目包含：

```
Project
 ├ Script
 ├ Storyboards
 ├ Images
 ├ Video Clips
 └ Final Video
```

---

# 5.2 Pipeline任务系统

系统核心为 **任务驱动 Pipeline**。

每一步生成行为为一个 Task。

---

## Task类型

| Task类型             | 说明     |
| ------------------ | ------ |
| StoryboardGenerate | 生成分镜脚本 |
| ImageGenerate      | 生成分镜图片 |
| VideoGenerate      | 生成视频片段 |
| VideoMerge         | 视频拼接   |

---

## Task状态

```
Pending      等待执行
Running      执行中
Generated    已生成
Reviewing    等待审核
Approved     审核通过
Rejected     审核拒绝
Failed       执行失败
```

---

## Task操作

用户可对Task执行：

* Approve（通过）
* Reject（拒绝）
* Edit（人工编辑）
* Regenerate（重新生成）

---

# 5.3 分镜脚本生成

## 输入

原始剧本

## 输出

结构化分镜脚本：

示例：

```
Scene 1
角色：A
动作：走进房间
镜头：中景

Scene 2
角色：A
动作：打开窗户
镜头：近景
```

数据结构：

```
Storyboard
    id
    scene_index
    description
    camera
    characters
    prompt
```

用户可编辑分镜描述。

---

# 5.4 分镜图片生成

系统根据分镜生成图片。

输入：

```
prompt
style
character
scene
```

输出：

```
image.png
```

用户可：

* 重新生成
* 上传替代图片
* 修改prompt

---

# 5.5 视频片段生成

每个分镜生成 **短视频片段**。

建议时长：

```
3s - 5s
```

输入：

```
start_frame
end_frame
prompt
```

输出：

```
clip_001.mp4
```

---

# 5.6 视频拼接

系统将所有视频片段拼接为最终视频。

流程：

```
clip1
clip2
clip3
↓
final_video
```

使用工具：

```
ffmpeg
```

支持：

* 设置转场
* 设置背景音乐
* 设置字幕（后续版本）

---

# 5.7 审核系统

系统提供审核界面。

每个生成步骤均可审核。

---

## 审核操作

| 操作         | 说明   |
| ---------- | ---- |
| Approve    | 通过   |
| Reject     | 拒绝   |
| Regenerate | 重新生成 |
| Edit       | 人工修改 |

---

# 5.8 资产管理

系统需保存所有中间资产。

资产类型：

| 类型          | 示例              |
| ----------- | --------------- |
| Script      | script.txt      |
| Storyboard  | storyboard.json |
| Image       | 001.png         |
| Video Clip  | clip001.mp4     |
| Final Video | final.mp4       |

---

## 文件结构

推荐：

```
storage/

project_001
    script.txt
    storyboard.json

    images/
        001.png
        002.png

    clips/
        clip001.mp4
        clip002.mp4

    final/
        video.mp4
```

---

# 6. 系统架构

## 技术栈

Frontend

```
React
Vite
Ant Design
```

Backend

```
FastAPI
Python
```

任务队列

```
Redis
RQ / Celery
```

视频处理

```
FFmpeg
```

---

# 7. AI Provider 架构

系统支持多AI提供者。

模块结构：

```
providers
 ├ llm
 │   openai_provider
 │   deepseek_provider
 │
 ├ image
 │   stable_diffusion
 │
 └ video
     runway
     kling
```

统一接口：

```
generate(input) -> output
```

这样可以随时替换模型。

---

# 8. 数据库设计（简化版）

## Project

```
id
name
script
status
created_at
```

---

## Task

```
id
project_id
type
status
input
output
version
created_at
```

---

## Asset

```
id
task_id
type
path
metadata
```

---

# 9. 非功能需求

| 需求   | 说明        |
| ---- | --------- |
| 可扩展性 | 支持新增AI模型  |
| 稳定性  | 任务失败可重试   |
| 可追溯  | 所有生成内容可回溯 |
| 资产安全 | 所有素材永久保存  |

---

# 10. MVP范围

第一版本仅实现：

```
1 项目创建
2 输入脚本
3 生成分镜脚本
4 生成分镜图片
5 生成视频片段
6 拼接视频
7 审核系统
```

不包含：

```
用户系统
协作
权限管理
字幕系统
音效系统
```

---

# 11. 未来扩展

未来版本可以增加：

### AI能力

* 角色一致性
* 场景连续性
* 自动字幕
* 自动配音

---

### 编辑能力

* 手动调整分镜
* 视频剪辑
* 字幕编辑

---

### 管理能力

* 多用户协作
* 权限系统
* 云端存储

---

# 12. 成功指标

系统上线后衡量指标：

| 指标    | 目标    |
| ----- | ----- |
| 制作效率  | 提升5倍  |
| 人工修改率 | 低于50% |
| 生成成功率 | >95%  |

---

# 13. 版本规划

V1

```
基础Pipeline
AI生成
人工审核
视频拼接
```

V2

```
字幕
配音
角色一致性
```

V3

```
协作
云端项目
素材库
```
