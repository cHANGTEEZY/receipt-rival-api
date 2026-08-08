import { createMiddleware } from "hono/factory";
import { resolver, uniqueSymbol } from "hono-openapi";
import type { z } from "zod";
import { mergeCorsIntoAuthResponse } from "../../shared/utils/cors-merge";
import type { AppVariables } from "../../shared/types/app.types";
import { formatAuthValidationMessage } from "./auth.validator";

function authValidationResponse(req: Request, message: string) {
  return mergeCorsIntoAuthResponse(
    req,
    new Response(
      JSON.stringify({
        code: "VALIDATION_ERROR",
        message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
}

async function validateJsonBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = await req.clone().text();

  if (!text.trim()) {
    return { ok: false, message: "Request body is required" };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: "Request body must be valid JSON" };
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: formatAuthValidationMessage(parsed.error) };
  }

  return { ok: true };
}

export const validateAuthBody = <T extends z.ZodType>(schema: T) => {
  const middleware = createMiddleware<{ Variables: AppVariables }>(
    async (c, next) => {
      const result = await validateJsonBody(c.req.raw, schema);

      if (!result.ok) {
        return authValidationResponse(c.req.raw, result.message);
      }

      await next();
    },
  );

  return Object.assign(middleware, {
    [uniqueSymbol]: {
      target: "json",
      ...resolver(schema),
    },
  });
};
