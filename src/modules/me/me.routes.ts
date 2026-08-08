import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { meController } from "./me.controller";
import { meDocs } from "./me.docs";

export const meRoutes = new Hono<{ Variables: AppVariables }>();

meRoutes.get(
  "/payments",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(meDocs.listPayments),
  (c) => meController.listPayments(c),
);

meRoutes.get(
  "/splits/owed-by-me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(meDocs.listSplitsOwedByMe),
  (c) => meController.listSplitsOwedByMe(c),
);

meRoutes.get(
  "/splits/owed-to-me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(meDocs.listSplitsOwedToMe),
  (c) => meController.listSplitsOwedToMe(c),
);
