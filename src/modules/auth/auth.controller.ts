import type { Context } from "hono";
import { env } from "../../config/env";
import { mergeCorsIntoAuthResponse } from "../../shared/utils/cors-merge";
import type { AppVariables } from "../../shared/types/app.types";
import { auth } from "./auth.service";

type AuthContext = Context<{ Variables: AppVariables }>;

/**
 * Native Expo/RN clients often send Cookie (from SecureStore) but no Origin.
 * Better Auth then rejects with MISSING_OR_NULL_ORIGIN. Prefer `expo-origin`
 * (set by `@better-auth/expo/client`), else fall back to FRONTEND_ORIGIN.
 */
function withAuthOrigin(req: Request): Request {
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") return req;

  const fallback =
    req.headers.get("expo-origin")?.trim() || env.FRONTEND_ORIGIN.trim();
  if (!fallback) return req;

  try {
    req.headers.set("origin", fallback);
    return req;
  } catch {
    const headers = new Headers(req.headers);
    headers.set("origin", fallback);
    return new Request(req, { headers });
  }
}

export const authController = {
  async handleAuthRequest(c: AuthContext) {
    const req = withAuthOrigin(c.req.raw);
    const res = await auth.handler(req);
    return mergeCorsIntoAuthResponse(req, res);
  },
};
