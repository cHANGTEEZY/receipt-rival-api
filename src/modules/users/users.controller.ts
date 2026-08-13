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

  async searchUsers(c: UsersContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const { query } = c.req.valid("query" as never) as { query: string };
    const data = await usersService.searchUsers(query, currentUser.id);

    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async getUser(c: UsersContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const userId = c.req.param("userId");
    if (!userId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "User id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    if (userId === currentUser.id) {
      const profile = await usersService.getProfile(userId);
      if (!profile) {
        return c.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "User not found" },
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
    }

    const card = await usersService.getPublicCard(userId);
    if (!card) {
      return c.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
          requestId: c.get("requestId"),
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: card,
      requestId: c.get("requestId"),
    });
  },
  async updateMe(c: UsersContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const { name } = c.req.valid("json" as never) as { name: string };
    const result = await usersService.updateProfile(currentUser.id, name);
    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async uploadAvatar(c: UsersContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Content-Type must be multipart/form-data",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const body = (await c.req.parseBody({ all: true })) as Record<string, unknown>;
    const raw = body.avatar ?? body.file ?? body.image;
    const file = Array.isArray(raw) ? raw[0] : raw;

    if (typeof File === "undefined" || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Avatar file is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await usersService.uploadAvatar(currentUser.id, file);
    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },
};
