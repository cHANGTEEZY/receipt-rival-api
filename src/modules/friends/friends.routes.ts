import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { friendsController } from "./friends.controller";
import { friendsDocs } from "./friends.docs";
import { createFriendRequestSchema } from "./friends.validator";

export const friendsRoutes = new Hono<{ Variables: AppVariables }>();

friendsRoutes.get(
  "/",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.listFriends),
  (c) => friendsController.listFriends(c),
);

friendsRoutes.get(
  "/requests",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.listRequests),
  (c) => friendsController.listRequests(c),
);

friendsRoutes.post(
  "/requests",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.sendRequest),
  validator("json", createFriendRequestSchema),
  (c) => friendsController.sendRequest(c),
);

friendsRoutes.post(
  "/requests/:friendshipId/accept",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.acceptRequest),
  (c) => friendsController.acceptRequest(c),
);

friendsRoutes.post(
  "/requests/:friendshipId/reject",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.rejectRequest),
  (c) => friendsController.rejectRequest(c),
);

friendsRoutes.delete(
  "/:friendUserId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(friendsDocs.removeFriend),
  (c) => friendsController.removeFriend(c),
);
