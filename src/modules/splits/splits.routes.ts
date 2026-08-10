import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { splitsController } from "./splits.controller";
import { splitsDocs } from "./splits.docs";

export const paymentSplitRoutes = new Hono<{ Variables: AppVariables }>();
export const splitRoutes = new Hono<{ Variables: AppVariables }>();

paymentSplitRoutes.post(
  "/:paymentId/splits/equal",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createEqualSplit),
  (c) => splitsController.createEqualSplit(c),
);

paymentSplitRoutes.post(
  "/:paymentId/splits/item-based",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createItemBasedSplit),
  (c) => splitsController.createItemBasedSplit(c),
);

paymentSplitRoutes.post(
  "/:paymentId/splits/percentage",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createPercentageSplit),
  (c) => splitsController.createPercentageSplit(c),
);

paymentSplitRoutes.post(
  "/:paymentId/splits/custom",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createCustomSplit),
  (c) => splitsController.createCustomSplit(c),
);

paymentSplitRoutes.get(
  "/:paymentId/splits",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.listByPayment),
  (c) => splitsController.listByPayment(c),
);

splitRoutes.get(
  "/:splitId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.getById),
  (c) => splitsController.getById(c),
);
