# VectorEngine Kling Omni 使用指南

## 目的

这份文档说明如何在 SweetStarAnimMaker 中通过 VectorEngine 使用 Kling Omni。

本文只覆盖当前仓库已经落地的 `packages/services` provider 能力：

- 生成单镜头视频，只提供首帧
- 生成单镜头视频，提供首帧和尾帧
- 生成单镜头视频，提供主体
- 创建图片定制主体
- 查询主体详情
- 查询主体列表

本文不覆盖：

- worker/bootstrap 接线
- core port 接线
- Omni 多镜头封装
- Omni 视频任务列表查询封装

## 文档与接口来源

参考文档：

- VectorEngine Omni Video 中转文档：`https://vectorengine.apifox.cn/api-394023139`
- Kling 官方 Omni Video 文档：`https://app.klingai.com/cn/dev/document-api/apiReference/model/OmniVideo`
- Kling 官方主体管理文档：`https://app.klingai.com/cn/dev/document-api/apiReference/model/element`

当前仓库 provider 走的是 VectorEngine 中转地址：

```text
POST /kling/v1/videos/omni-video
GET  /kling/v1/videos/omni-video/{id}

POST /kling/v1/general/advanced-custom-elements
GET  /kling/v1/general/advanced-custom-elements/{id}
GET  /kling/v1/general/advanced-custom-elements
```

## 当前仓库入口

代码入口：

- `packages/services/src/providers/kling-omni-provider.ts`

聚合导出：

- `packages/services/src/index.ts`

测试入口：

- `packages/services/tests/kling-omni-provider.test.ts`

当前 provider 工厂函数：

```ts
createKlingOmniProvider()
```

## 当前默认配置

provider 默认值如下：

- `baseUrl = "https://api.vectorengine.ai"`
- `modelName = "kling-v3-omni"`
- `mode = "pro"`
- `duration = "5"`

其中最重要的一点是：

- 当前 provider 默认固定使用 `kling-v3-omni`

这是有意设计，因为 2026-03-26 的实测结论是：

- `kling-v3-omni` + `duration=3` 可成功创建任务
- `kling-video-o1` 不能直接拿来替代当前仓库封装的行为判断

## 环境变量

最少需要：

```env
VECTORENGINE_API_TOKEN=your-token
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
```

如果你会传本地图片路径，建议同时配置图床上传能力：

```env
IMAGE_UPLOAD_PROVIDER_ORDER=psda1,picgo
PICGO_API_KEY=your-picgo-api-key
```

原因是：

- Omni 视频首尾帧支持本地路径输入
- 图片定制主体的参考图也支持本地路径输入
- 本地路径会先通过现有 `ReferenceImageUploader` 上传成公网 URL，再发给 VectorEngine

## 最小初始化示例

```ts
import { createKlingOmniProvider } from "@sweet-star/services";

const provider = createKlingOmniProvider({
  apiToken: process.env.VECTORENGINE_API_TOKEN,
  baseUrl: process.env.VECTORENGINE_BASE_URL,
});
```

如果你希望支持本地图片路径，需要把现有的 reference image uploader 也传进去。

## 能力 1：生成单镜头视频，只提供首帧

当前封装方法：

```ts
submitOmniVideoWithStartFrame()
```

这个模式适合：

- 变化不大的镜头
- 只需要在首帧基础上做轻微动作、表情、镜头推进
- 不想额外提供尾帧约束

对应请求会被转换成：

```json
{
  "model_name": "kling-v3-omni",
  "mode": "pro",
  "prompt": "让<<<image_1>>>中的角色保持构图稳定，只做轻微表情和头部变化。",
  "duration": "3",
  "image_list": [
    { "image_url": "https://...", "type": "first_frame" }
  ]
}
```

示例：

```ts
const submitted = await provider.submitOmniVideoWithStartFrame({
  promptText: "让<<<image_1>>>中的角色保持构图稳定，只做轻微表情和头部变化。",
  startImage: "E:/tmp/start.png",
  durationSeconds: 3,
});
```

说明：

- 当前仍然是单镜头模式
- 只会向上游发送一个 `first_frame`
- `startImage` 支持 URL 或本地路径

## 能力 2：生成单镜头视频，提供首帧和尾帧

当前封装方法：

```ts
submitOmniVideoWithFrames()
```

对应请求会被转换成：

```json
{
  "model_name": "kling-v3-omni",
  "mode": "pro",
  "prompt": "让<<<image_1>>>中的角色缓慢转身看向镜头。",
  "duration": "3",
  "aspect_ratio": "16:9",
  "image_list": [
    { "image_url": "https://...", "type": "first_frame" },
    { "image_url": "https://...", "type": "end_frame" }
  ]
}
```

示例：

```ts
const submitted = await provider.submitOmniVideoWithFrames({
  promptText: "让<<<image_1>>>中的角色缓慢转身看向镜头。",
  startImage: "E:/tmp/start.png",
  endImage: "E:/tmp/end.png",
  durationSeconds: 3,
  aspectRatio: "16:9",
});

console.log(submitted.taskId);
console.log(submitted.status);
```

查询任务：

```ts
const task = await provider.getOmniVideoTask({
  taskId: submitted.taskId,
});

console.log(task.status);
console.log(task.videoUrl);
console.log(task.completed);
console.log(task.failed);
```

说明：

- `startImage` 和 `endImage` 都可以传 URL 或本地路径
- 当前封装是单镜头，不处理 `multi_shot`
- `videoUrl` 会优先从 `data.task_result.videos[0].url` 读取

## 能力 3：生成单镜头视频，提供主体

当前封装方法：

```ts
submitOmniVideoWithElements()
```

对应请求核心字段：

```json
{
  "model_name": "kling-v3-omni",
  "mode": "pro",
  "prompt": "<<<element_1>>>走向<<<element_2>>>并拥抱对方。",
  "duration": "5",
  "aspect_ratio": "1:1",
  "element_list": [
    { "element_id": 101 },
    { "element_id": 202 }
  ]
}
```

示例：

```ts
const submitted = await provider.submitOmniVideoWithElements({
  promptText: "<<<element_1>>>走向<<<element_2>>>并拥抱对方。",
  elementIds: ["101", 202],
  durationSeconds: 5,
  aspectRatio: "1:1",
});
```

说明：

- `elementIds` 可以传字符串或数字
- provider 会尽量把纯数字字符串转成数字再发给上游
- 当前仍然是单镜头任务，不封装 `shot_type` / `multi_prompt`

## 能力 4：上传一个主体

当前封装方法：

```ts
createElement()
```

当前仓库实现的是：

- 图片定制主体
- 即 `reference_type = "image_refer"`

也就是说，当前封装不包含视频定制主体上传，只封装了图片主体。

对应官方字段：

- `element_name`
- `element_description`
- `reference_type`
- `element_image_list.frontal_image`
- `element_image_list.refer_images[]`

示例：

```ts
const created = await provider.createElement({
  name: "阿福",
  description: "雨夜包子摊老板，中年男性。",
  frontalImage: "E:/tmp/frontal.png",
  referenceImages: [
    "E:/tmp/ref-1.png",
    "E:/tmp/ref-2.png",
  ],
  tagIds: ["o_102"],
});

console.log(created.taskId);
console.log(created.status);
```

上游请求体会被整理成：

```json
{
  "element_name": "阿福",
  "element_description": "雨夜包子摊老板，中年男性。",
  "reference_type": "image_refer",
  "element_image_list": {
    "frontal_image": "https://...",
    "refer_images": [
      { "image_url": "https://..." },
      { "image_url": "https://..." }
    ]
  },
  "tag_list": [
    { "tag_id": "o_102" }
  ]
}
```

说明：

- `frontalImage` 必填
- `referenceImages` 当前至少要有一张
- 本地路径同样会先上传再调用主体接口

## 能力 5：查询主体详情

当前封装方法：

```ts
getElement()
```

示例：

```ts
const detail = await provider.getElement({
  taskId: "element_task_done",
});

console.log(detail.taskId);
console.log(detail.status);
console.log(detail.elementId);
console.log(detail.elementName);
console.log(detail.referenceType);
```

返回结构里会额外做一层归一化：

- `elementId` 一律转成字符串
- `status` 是任务状态
- `elementStatus` 是主体本身状态
- `rawResponse` 保留原始 JSON 字符串

注意：

- 这里的 `{id}` 当前按任务查询方式封装
- 返回值中的主体信息取自 `task_result.elements[0]`

## 能力 6：查询主体列表

当前封装方法：

```ts
listElements()
```

示例：

```ts
const result = await provider.listElements({
  pageNum: 1,
  pageSize: 30,
});

for (const item of result.items) {
  console.log(item.taskId, item.status, item.elementId, item.elementName);
}
```

说明：

- 当前封装的是“自定义主体列表”
- 走的是 `/kling/v1/general/advanced-custom-elements`
- 分页参数范围按官方文档处理：
  - `pageNum: 1 ~ 1000`
  - `pageSize: 1 ~ 500`

## 当前已知限制

### 1. 当前仓库只封装了单镜头 Omni

虽然官方支持：

- `multi_shot`
- `shot_type`
- `multi_prompt`

但当前 provider 没有封装这些字段，只做单镜头最小可用能力。

### 2. 当前主体创建只封装图片主体

官方主体管理还支持：

- `reference_type = "video_refer"`

但当前仓库只实现了图片主体上传，不包含视频主体上传。

### 3. 当前没有封装 Omni 视频任务列表查询

原因不是官方没有这个接口，而是当前对 VectorEngine 中转做的真实探测结果显示：

- `GET /kling/v1/videos/omni-video?pageNum=...`
- 在 2026-03-26 的实测里返回的是 HTML，而不是 JSON

所以当前 provider 只封装：

- 创建任务
- 查询单任务

### 4. 任务状态要以 `data.task_status` 为准

不要只看顶层 `message`。

当前已实测到的情况是：

- 顶层 `message = "SUCCEED"`
- 但 `data.task_status = "submitted"`

因此判断任务是否完成时，应看：

- `submitted`
- `processing`
- `succeed`
- `failed`

## 常见错误

### 401 / 403

优先检查：

- `VECTORENGINE_API_TOKEN` 是否正确
- token 是否存在空格

### 本地图片路径报错

常见原因：

- 没传 `referenceImageUploader`
- 图床上传失败
- 本地路径不存在

### 任务创建成功但没有 `videoUrl`

这通常说明任务还没到终态。

应该继续查询：

```ts
await provider.getOmniVideoTask({ taskId });
```

直到：

- `completed === true`
- 或 `failed === true`

### 主体创建成功但还没有主体信息

主体接口返回的也是异步任务风格，不应假设创建请求返回时主体已经完全可用。

应该继续查：

```ts
await provider.getElement({ taskId });
```

## 一个完整的典型流程

如果你的目标是“先创建主体，再用主体生成视频”，推荐顺序如下：

1. 调用 `createElement()` 创建图片主体
2. 用 `getElement()` 轮询，直到拿到 `elementId`
3. 调用 `submitOmniVideoWithElements()` 发起视频任务
4. 用 `getOmniVideoTask()` 查询视频状态，直到拿到 `videoUrl`

如果你的目标是“直接基于首尾帧做单镜头视频”，推荐顺序如下：

1. 调用 `submitOmniVideoWithFrames()`
2. 用 `getOmniVideoTask()` 轮询
3. 在 `task_result.videos[0].url` 出现后取走视频地址

如果你的目标是“基于一张参考图做变化不大的镜头”，推荐顺序如下：

1. 调用 `submitOmniVideoWithStartFrame()`
2. 用 `getOmniVideoTask()` 轮询
3. 在 `task_result.videos[0].url` 出现后取走视频地址

## 结论

截至 2026-03-26，当前仓库已经具备一个独立的、可复用的 Kling Omni provider，适合先在 `packages/services` 层做最小接入。

已具备：

- `kling-v3-omni` 单镜头单首帧视频生成
- `kling-v3-omni` 单镜头首尾帧视频生成
- `kling-v3-omni` 单镜头主体视频生成
- 图片定制主体创建
- 主体详情查询
- 主体列表查询

暂未具备：

- Omni 多镜头封装
- 视频定制主体上传
- Omni 视频任务列表封装
