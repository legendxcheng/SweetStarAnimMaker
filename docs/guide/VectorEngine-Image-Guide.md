# VectorEngine Image Guide

## Overview

SweetStarAnimMaker supports local reference image files for VectorEngine image generation by uploading them to a public image host first.

The request flow is:

```text
local file path -> reference image uploader -> public URL -> image[]
```

Do not send local filesystem paths directly to `POST /v1/images/generations`. VectorEngine expects public URL strings in the `image` array.

## Configuration

Set the uploader configuration in the worker environment:

```env
IMAGE_UPLOAD_PROVIDER_ORDER=psda1,picgo
PICGO_API_KEY=your-picgo-api-key
```

Rules:

- Default provider order is `psda1,picgo`
- Unknown provider names are ignored
- Duplicate provider names are ignored after the first valid occurrence
- If the configured list becomes empty after parsing, the default order is used
- `psda1` requires no extra secret
- `picgo` requires `PICGO_API_KEY`

## Runtime Behavior

When `referenceImagePaths` are present on a character-sheet image request:

1. The worker reads each local file from disk.
2. The reference image uploader tries the configured providers in order.
3. The first successful provider returns a public URL.
4. The turnaround image provider sends those URLs in the VectorEngine `image` field.

If every upload provider fails, image generation stops before the VectorEngine request is sent.

## Concurrency Capability vs Repository Defaults

These two points are different and should not be mixed together:

- **VectorEngine image API capability**: under the current integration result, `/v1/images/generations` can support `20` concurrent requests
- **Current repository default**: this repo still sends image-generation traffic with a worker concurrency of `4`

Current behavior in this repository:

- reference image upload inside a single image request still follows provider order and is a sequential fallback flow, not a provider race
- `images_generate` is a batch orchestration task that creates per-frame work items
- `frame_image_generate` worker concurrency is currently `4`, so the repo will only issue up to `4` VectorEngine image requests in parallel by default

This means:

- if your throughput is capped at `4`, the first bottleneck is usually the local worker setting, not the upstream VectorEngine image API
- if you want the project to actually use the known `20`-concurrency capacity, you need to raise the worker concurrency explicitly

Relevant code:

- `apps/worker/src/index.ts`
- `packages/core/src/use-cases/process-images-generate-task.ts`
- `packages/core/src/use-cases/process-frame-image-generate-task.ts`

The most direct adjustment is:

```ts
{
  queueName: frameImageGenerateQueueName,
  concurrency: 20,
}
```

Important notes:

- the `20`-concurrency statement applies to the outbound VectorEngine image-generation API calls
- it does **not** mean uploader providers are run in parallel for a single reference image
- if a frame needs reference-image uploads first, that upload step still happens before the image-generation request for that frame is sent
- if the same token is also used by Gemini or other image jobs, you still need to budget total account-level concurrency

## Throughput Tuning Advice

If you raise image concurrency toward `20`, pay attention to:

- `429` responses from VectorEngine
- intermittent upstream `503` failures
- local worker CPU, memory, and network saturation
- upload-provider stability, because reference-image upload may become the pre-request bottleneck

A practical logging baseline is:

- frame id
- current queue concurrency
- reference image count
- upload provider used
- VectorEngine HTTP status
- short error summary

## Current Scope

This uploader is currently used for reference images that feed image-generation requests.

Out of scope for this release:

- Uploading generated output images
- Browser-side uploads
- A standalone upload API
- Automatic image compression or format conversion
