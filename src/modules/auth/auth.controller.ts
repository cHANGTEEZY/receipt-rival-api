import type { Context } from "hono";
import { mergeCorsIntoAuthResponse } from "../../shared/utils/cors-merge";
import type { AppVariables } from "../../shared/types/app.types";
import { auth } from "./auth.service";

type AuthContext = Context<{ Variables: AppVariables }>;

export const authController = {
  async handleAuthRequest(c: AuthContext) {
    const res = await auth.handler(c.req.raw);
    return mergeCorsIntoAuthResponse(c.req.raw, res);
  },
};
