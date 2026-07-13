import type { ArcjetDecision } from "@arcjet/bun";
import { createMiddleware } from "hono/factory";
import { ajAuth, ajAuthSignup } from "../shared/utils/arcjet";
import { handleArcjetDecision } from "../shared/utils/arcjet-deny";
import { mergeCorsIntoAuthResponse } from "../shared/utils/cors-merge";
import { authSignupBodySchema } from "../modules/auth/auth.validator";
import type { AppVariables } from "../shared/types/app.types";

/**
 * Arcjet is abuse/edge protection: bot detection, WAF "shield" attack
 * signatures, and IP-based rate limiting. It runs before any route logic and
 * has no idea whether a request is authenticated - it only decides whether a
 * request is allowed to reach the route at all.
 *
 * This is a different concern from `requireAuth()` (see
 * `src/middleware/require-auth.ts`), which checks whether a real user
 * *session* exists on the request (set earlier by `sessionMiddleware`).
 * Both can run on the same route, but each should only be defined once, at
 * the route level, instead of being re-implemented inside controllers.
 *
 * @param client An Arcjet client from `src/shared/utils/arcjet.ts` (e.g.
 *   `aj`, `ajApi`) that doesn't require extra per-request properties.
 */
export const arcjetProtect = (client: {
  protect: (
    request: Request,
    properties?: { correlationId?: string },
  ) => Promise<ArcjetDecision>;
}) =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const decision = await client.protect(c.req.raw, {
      correlationId: c.get("requestId"),
    });
    const denied = handleArcjetDecision(c, decision);
    if (denied) return denied;

    await next();
  });

/**
 * Arcjet guard for the Better Auth catch-all routes (`/api/auth/*`).
 *
 * Sign-up requests get the stricter `ajAuthSignup` client (bot blocking +
 * disposable/invalid email checks) when an email can be read from the body;
 * every other auth request (sign-in, session, sign-out, etc.) gets the
 * general `ajAuth` rate limit. Denied responses need CORS headers merged in
 * manually because Better Auth's handler bypasses Hono's own `cors()`
 * middleware (see `mergeCorsIntoAuthResponse`).
 */
export const arcjetAuthGuard = () =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const pathname = new URL(c.req.url).pathname;
    const isSignup = pathname.includes("/sign-up") && c.req.method === "POST";

    let decision: ArcjetDecision;
    if (isSignup) {
      const email = await readSignupEmail(c.req.raw);
      decision = email
        ? await ajAuthSignup.protect(c.req.raw, {
            email,
            correlationId: c.get("requestId"),
          })
        : await ajAuth.protect(c.req.raw, {
            correlationId: c.get("requestId"),
          });
    } else {
      decision = await ajAuth.protect(c.req.raw, {
        correlationId: c.get("requestId"),
      });
    }

    const denied = handleArcjetDecision(c, decision);
    if (denied) {
      return mergeCorsIntoAuthResponse(c.req.raw, denied);
    }

    await next();
  });

async function readSignupEmail(request: Request): Promise<string | undefined> {
  try {
    const body = authSignupBodySchema.parse(await request.clone().json());
    return body.email;
  } catch {
    return undefined;
  }
}
