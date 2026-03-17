import {
  ProjectNotFoundError,
  ProjectValidationError,
  TaskNotFoundError,
} from "@sweet-star/core";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function createApiErrorHandler() {
  return function apiErrorHandler(
    error: FastifyError | Error,
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (error instanceof ProjectValidationError || error instanceof ZodError) {
      return reply.status(400).send({
        message: error.message,
      });
    }

    if (error instanceof ProjectNotFoundError || error instanceof TaskNotFoundError) {
      return reply.status(404).send({
        message: error.message,
      });
    }

    return reply.status(500).send({
      message: "Internal Server Error",
    });
  };
}
