import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import { ajApi } from "../../shared/utils/arcjet";
import type { AppVariables } from "../../shared/types/app.types";
import { usersController } from "./users.controller";
import { usersDocs } from "./users.docs";

export const usersRoutes = new Hono<{ Variables: AppVariables }>();

usersRoutes.get(
  "/me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.getMe),
  (c) => usersController.getMe(c),
);
