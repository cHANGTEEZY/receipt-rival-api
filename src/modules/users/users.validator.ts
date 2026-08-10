import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const publicUserCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

export const publicUserSearchResultSchema = publicUserSchema.extend({
  friendRequestStatus: z.enum(["pending", "accepted"]).nullable(),
  friendshipId: z.string().nullable(),
  requestDirection: z.enum(["sent", "received"]).nullable(),
});

export const searchUsersQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .max(100, "Query cannot be more than 100 characters")
    .meta({
      description: "Search by name or email",
      example: "alex",
    }),
});
