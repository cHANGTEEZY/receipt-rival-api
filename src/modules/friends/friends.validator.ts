import { z } from "zod";

export const createFriendRequestSchema = z
  .object({
    userId: z
      .string()
      .min(1, "User id is required")
      .meta({
        description: "User id to send a friend request to",
        example: "user_abc123",
      }),
  })
  .meta({
    example: { userId: "user_abc123" },
  });

export const publicFriendUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

export const publicFriendshipSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  addresseeId: z.string(),
  status: z.enum(["pending", "accepted", "removed"]),
  requestedAt: z.coerce.date(),
  acceptedAt: z.coerce.date().nullable(),
  friend: publicFriendUserSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const publicFriendRequestSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  addresseeId: z.string(),
  status: z.enum(["pending", "accepted", "removed"]),
  requestedAt: z.coerce.date(),
  requester: publicFriendUserSchema,
  createdAt: z.coerce.date(),
});
