import { resolver } from "hono-openapi";
import { z } from "zod";
import { deadbeatLeaderboardSchema } from "./deadbeat.validator";

export const deadbeatTags = ["Deadbeat"];

const deadbeatErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

const leaderboardResponseSchema = z.object({
  success: z.literal(true),
  data: deadbeatLeaderboardSchema,
  requestId: z.string(),
});

export const deadbeatDocs = {
  getLeaderboard: {
    tags: deadbeatTags,
    summary: "Deadbeat leaderboard",
    description:
      "Returns Wall of Shame and Hall of Fame boards for the authenticated user, their accepted friends, and people who share a finalized or completed payment with them. Shame score uses overdue pending splits: min(maxDaysLate * 1.5, 55) + min(overdueCount * 8, 25) + min(overdueAmountCents / 2000, 20), clamped 0–100. Fame score is clamp(0, 100, 100 - shameScore + min(settledCount * 6, 20)). Titles are picked from the score band using a stable hash of the user id.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Shame and fame leaderboards for the current user's circle",
        content: {
          "application/json": {
            schema: resolver(leaderboardResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": { schema: resolver(deadbeatErrorSchema) },
        },
      },
    },
  },
};
