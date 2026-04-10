import { FAILURE_STATUSES, SUCCESS_STATUSES } from "./kling-omni-provider.constants";
import { readFirstArrayItem, readFirstString, readStringLike } from "./kling-omni-provider.helpers";
import type {
  GetElementResult,
  NormalizedTaskState,
  SubmitOmniVideoResult,
  SubmitResultContext,
} from "./kling-omni-provider.types";

export function normalizeSubmitResult(
  payload: unknown,
  input: SubmitResultContext,
): SubmitOmniVideoResult {
  const taskId = readFirstString(payload, [
    ["data", "task_id"],
    ["data", "id"],
    ["task_id"],
    ["id"],
  ]);

  if (!taskId) {
    throw new Error(input.missingIdMessage);
  }

  return {
    taskId,
    status: readFirstString(payload, [
      ["data", "task_status"],
      ["data", "status"],
      ["task_status"],
      ["status"],
    ]),
    provider: input.provider,
    modelName: input.modelName,
    mode: input.mode,
    rawResponse: JSON.stringify(payload),
  };
}

export function normalizeElementTaskResult(
  payload: unknown,
  fallbackTaskId: string | null,
): GetElementResult {
  const task = normalizeTaskState(payload, fallbackTaskId);
  const firstElement = readFirstArrayItem(payload, [
    ["data", "task_result", "elements"],
    ["task_result", "elements"],
  ]);

  return {
    taskId: task.taskId,
    status: task.status,
    errorMessage: task.errorMessage,
    completed: task.completed,
    failed: task.failed,
    elementId: readStringLike(firstElement, [["element_id"]]),
    elementName: readFirstString(firstElement, [["element_name"]]),
    elementDescription: readFirstString(firstElement, [["element_description"]]),
    referenceType: readFirstString(firstElement, [["reference_type"]]),
    elementStatus: readFirstString(firstElement, [["status"]]),
    rawResponse: JSON.stringify(payload),
  };
}

export function normalizeTaskState(
  payload: unknown,
  fallbackTaskId: string | null,
): NormalizedTaskState {
  const status = readFirstString(payload, [
    ["data", "task_status"],
    ["data", "status"],
    ["task_status"],
    ["status"],
  ]);
  const normalizedStatus = status?.trim().toLowerCase() ?? null;
  const failed = normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false;

  return {
    taskId:
      readFirstString(payload, [
        ["data", "task_id"],
        ["data", "id"],
        ["task_id"],
        ["id"],
      ]) ?? fallbackTaskId ?? "",
    status,
    errorMessage: readTaskErrorMessage(payload, failed),
    completed: normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false,
    failed,
  };
}

export function normalizeElementIds(value: Array<string | number>) {
  const items = value
    .map((item) => normalizeElementIdForRequest(item))
    .filter((item): item is string | number => item !== null);

  if (items.length === 0) {
    throw new Error("elementIds must include at least one element id");
  }

  return items.map((elementId) => ({
    element_id: elementId,
  }));
}

function normalizeElementIdForRequest(value: string | number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/u.test(trimmed)) {
    const asNumber = Number(trimmed);
    if (Number.isSafeInteger(asNumber)) {
      return asNumber;
    }
  }

  return trimmed;
}

function readTaskErrorMessage(payload: unknown, failed: boolean) {
  const dedicatedError = readFirstString(payload, [
    ["data", "task_status_msg"],
    ["data", "error_message"],
    ["data", "error", "message"],
    ["task_status_msg"],
    ["error_message"],
    ["error", "message"],
  ]);

  if (dedicatedError) {
    return dedicatedError;
  }

  if (!failed) {
    return null;
  }

  return readFirstString(payload, [["message"]]);
}
