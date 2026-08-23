import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { deadbeatService } from "./deadbeat.service";

type DeadbeatContext = Context<{ Variables: AppVariables }>;

export const deadbeatController = {
  async getLeaderboard(c: DeadbeatContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await deadbeatService.getLeaderboard(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },
};
