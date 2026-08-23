import { z } from "zod";

export const deadbeatPublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

export const deadbeatLeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  user: deadbeatPublicUserSchema,
  shameScore: z.number().int().min(0).max(100),
  fameScore: z.number().int().min(0).max(100),
  title: z.string(),
  daysLate: z.number().int().min(0),
  overdueCount: z.number().int().min(0),
  overdueAmountCents: z.number().int().min(0),
  settledCount: z.number().int().min(0),
  currency: z.string().length(3),
  isCurrentUser: z.boolean(),
});

export const deadbeatMeSummarySchema = z.object({
  rank: z.number().int().min(1),
  shameScore: z.number().int().min(0).max(100),
  fameScore: z.number().int().min(0).max(100),
  title: z.string(),
});

export const deadbeatBoardSchema = z.object({
  entries: z.array(deadbeatLeaderboardEntrySchema),
  me: deadbeatMeSummarySchema.nullable(),
});

export const deadbeatLeaderboardSchema = z.object({
  shame: deadbeatBoardSchema,
  fame: deadbeatBoardSchema,
});
