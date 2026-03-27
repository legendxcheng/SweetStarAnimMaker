# VectorEngine Image Guide

## Overview

SweetStarAnimMaker now supports local reference image files for VectorEngine image generation by uploading them to a public image host first.

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

## Current Parallelism

Current image generation in this repository is split by stage:

- reference image upload inside a single image request still follows configured uploader order and is not a bulk parallel uploader
- `images_generate` is a batch orchestration task that creates per-frame work items
- `frame_image_generate` worker concurrency is `4`, so multiple VectorEngine image requests can run in parallel

Relevant code:

- `apps/worker/src/index.ts`
- `packages/core/src/use-cases/process-images-generate-task.ts`
- `packages/core/src/use-cases/process-frame-image-generate-task.ts`

If you see `429` or unstable upstream failures after raising throughput, reduce worker concurrency before changing request payloads.

## Current Scope

This uploader is currently used for reference images that feed image-generation requests.

Out of scope for this release:

- Uploading generated output images
- Browser-side uploads
- A standalone upload API
- Automatic image compression or format conversion

