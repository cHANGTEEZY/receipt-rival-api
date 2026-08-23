import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { deadbeatController } from "./deadbeat.controller";
import { deadbeatDocs } from "./deadbeat.docs";

export const deadbeatRoutes = new Hono<{ Variables: AppVariables }>();

deadbeatRoutes.get(
  "/leaderboard",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(deadbeatDocs.getLeaderboard),
  (c) => deadbeatController.getLeaderboard(c),
);
