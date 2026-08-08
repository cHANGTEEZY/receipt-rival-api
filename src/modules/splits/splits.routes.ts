import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { splitsController } from "./splits.controller";
import { splitsDocs } from "./splits.docs";
import {
  createEqualSplitSchema,
  createItemBasedSplitSchema,
} from "./splits.validator";

export const paymentSplitRoutes = new Hono<{ Variables: AppVariables }>();
export const splitRoutes = new Hono<{ Variables: AppVariables }>();

paymentSplitRoutes.post(
  "/:paymentId/splits/equal",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createEqualSplit),
  validator("json", createEqualSplitSchema),
  (c) => splitsController.createEqualSplit(c),
);

paymentSplitRoutes.post(
  "/:paymentId/splits/item-based",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(splitsDocs.createItemBasedSplit),
  validator("json", createItemBasedSplitSchema),
  (c) => splitsController.createItemBasedSplit(c),
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
