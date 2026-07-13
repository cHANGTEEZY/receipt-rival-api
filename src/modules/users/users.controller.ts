import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { usersService } from "./users.service";

type UsersContext = Context<{ Variables: AppVariables }>;

export const usersController = {
  async getMe(c: UsersContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const profile = await usersService.getProfile(currentUser.id);
    if (!profile) {
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
          requestId: c.get("requestId"),
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: profile,
      requestId: c.get("requestId"),
    });
  },
};
