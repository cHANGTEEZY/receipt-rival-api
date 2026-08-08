import { resolver } from "hono-openapi";
import { z } from "zod";
import { publicUserCardSchema, publicUserSchema } from "./users.validator";

export const usersTags = ["Users"];

export const userProfileResponseSchema = z.object({
  success: z.literal(true),
  data: publicUserSchema,
  requestId: z.string(),
});

export const userCardResponseSchema = z.object({
  success: z.literal(true),
  data: publicUserCardSchema,
  requestId: z.string(),
});

export const userListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicUserSchema),
  requestId: z.string(),
});

export const usersErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

export const usersDocs = {
  getMe: {
    tags: usersTags,
    summary: "Get current user profile",
    description: "Returns the authenticated user's profile from the database.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Current user profile",
        content: {
          "application/json": {
            schema: resolver(userProfileResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(usersErrorSchema),
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: resolver(usersErrorSchema),
          },
        },
      },
    },
  },
  searchUsers: {
    tags: usersTags,
    summary: "Search users",
    description: "Search users by name or email. Excludes the current user.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Matching users",
        content: {
          "application/json": {
            schema: resolver(userListResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(usersErrorSchema),
          },
        },
      },
    },
  },
  getUser: {
    tags: usersTags,
    summary: "Get user by id",
    description:
      "Returns a public user card (id, name, image). Own profile includes email.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "User details",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.union([publicUserSchema, publicUserCardSchema]),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(usersErrorSchema),
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: resolver(usersErrorSchema),
          },
        },
      },
    },
  },
};
