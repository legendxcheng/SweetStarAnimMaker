import {
  CurrentMasterPlotNotFoundError,
  ProjectNotFoundError,
  ProjectValidationError,
  RejectStoryboardReasonRequiredError,
  StoryboardReviewVersionConflictError,
  TaskNotFoundError,
} from "@sweet-star/core";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function createApiErrorHandler() {
  return function apiErrorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (error instanceof ProjectValidationError || error instanceof ZodError) {
      return reply.status(400).send({
        message: error.message,
      });
    }

    if (error instanceof RejectStoryboardReasonRequiredError) {
      return reply.status(400).send({
        message: error.message,
      });
    }

    if (
      error instanceof CurrentMasterPlotNotFoundError ||
      error instanceof ProjectNotFoundError ||
      error instanceof TaskNotFoundError
    ) {
      return reply.status(404).send({
        message: error.message,
      });
    }

    if (error instanceof StoryboardReviewVersionConflictError) {
      return reply.status(409).send({
        message: error.message,
      });
    }

    console.error(
      `[api] unhandled request error: ${request.method} ${request.url}`,
      error,
    );

    return reply.status(500).send({
      message: "Internal Server Error",
    });
  };
}
