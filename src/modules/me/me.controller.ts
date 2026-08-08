import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { meService } from "./me.service";

type MeContext = Context<{ Variables: AppVariables }>;

export const meController = {
  async listPayments(c: MeContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await meService.listPayments(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async listSplitsOwedByMe(c: MeContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await meService.listSplitsOwedByMe(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async listSplitsOwedToMe(c: MeContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await meService.listSplitsOwedToMe(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },
};
