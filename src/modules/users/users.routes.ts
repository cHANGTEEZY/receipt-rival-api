import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { usersController } from "./users.controller";
import { usersDocs } from "./users.docs";
import { searchUsersQuerySchema, updateMeSchema } from "./users.validator";

export const usersRoutes = new Hono<{ Variables: AppVariables }>();

usersRoutes.get(
  "/me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.getMe),
  (c) => usersController.getMe(c),
);

usersRoutes.get(
  "/search",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.searchUsers),
  validator("query", searchUsersQuerySchema),
  (c) => usersController.searchUsers(c),
);

usersRoutes.patch(
  "/me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.updateMe),
  validator("json", updateMeSchema),
  (c) => usersController.updateMe(c),
);

usersRoutes.post(
  "/me/avatar",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.uploadAvatar),
  (c) => usersController.uploadAvatar(c),
);

usersRoutes.get(
  "/:userId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(usersDocs.getUser),
  (c) => usersController.getUser(c),
);
