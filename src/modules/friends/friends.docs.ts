import { resolver } from "hono-openapi";
import { z } from "zod";
import {
  publicFriendRequestSchema,
  publicFriendshipSchema,
} from "./friends.validator";

export const friendsTags = ["Friends"];

const friendsErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

const friendshipResponseSchema = z.object({
  success: z.literal(true),
  data: publicFriendshipSchema,
  requestId: z.string(),
});

const friendshipListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicFriendshipSchema),
  requestId: z.string(),
});

const requestListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicFriendRequestSchema),
  requestId: z.string(),
});

export const friendsDocs = {
  listFriends: {
    tags: friendsTags,
    summary: "List friends",
    description: "Returns accepted friends for the authenticated user.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Friend list",
        content: {
          "application/json": {
            schema: resolver(friendshipListResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
  listRequests: {
    tags: friendsTags,
    summary: "List incoming friend requests",
    description:
      "Returns pending friend requests where the authenticated user is the addressee.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Incoming requests",
        content: {
          "application/json": {
            schema: resolver(requestListResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
  sendRequest: {
    tags: friendsTags,
    summary: "Send friend request",
    description: "Creates a pending friendship with the target user.",
    security: [{ cookieAuth: [] }],
    responses: {
      201: {
        description: "Friend request created",
        content: {
          "application/json": {
            schema: resolver(friendshipResponseSchema),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
  acceptRequest: {
    tags: friendsTags,
    summary: "Accept friend request",
    description: "Accepts a pending friend request addressed to you.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Friendship accepted",
        content: {
          "application/json": {
            schema: resolver(friendshipResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      403: {
        description: "Not allowed",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      404: {
        description: "Request not found",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
  rejectRequest: {
    tags: friendsTags,
    summary: "Reject friend request",
    description: "Rejects a pending friend request addressed to you.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Request rejected",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.object({ id: z.string() }),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      403: {
        description: "Not allowed",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      404: {
        description: "Request not found",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
  removeFriend: {
    tags: friendsTags,
    summary: "Remove friend",
    description: "Soft-removes an accepted friendship.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Friend removed",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.object({ friendUserId: z.string() }),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
      404: {
        description: "Friendship not found",
        content: {
          "application/json": { schema: resolver(friendsErrorSchema) },
        },
      },
    },
  },
};
