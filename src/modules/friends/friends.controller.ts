import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { friendsService } from "./friends.service";

type FriendsContext = Context<{ Variables: AppVariables }>;

export const friendsController = {
  async listFriends(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await friendsService.listFriends(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async listRequests(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await friendsService.listRequests(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async sendRequest(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const { userId } = c.req.valid("json" as never) as { userId: string };
    const result = await friendsService.sendRequest(currentUser.id, userId);

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

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async acceptRequest(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const friendshipId = c.req.param("friendshipId");
    if (!friendshipId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Friendship id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await friendsService.acceptRequest(
      currentUser.id,
      friendshipId,
    );

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

  async rejectRequest(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const friendshipId = c.req.param("friendshipId");
    if (!friendshipId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Friendship id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await friendsService.rejectRequest(
      currentUser.id,
      friendshipId,
    );

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

  async removeFriend(c: FriendsContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const friendUserId = c.req.param("friendUserId");
    if (!friendUserId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Friend user id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await friendsService.removeFriend(
      currentUser.id,
      friendUserId,
    );

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
