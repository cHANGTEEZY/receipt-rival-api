import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { settlementController } from "./settlement.controller";
import { settlementDocs } from "./settlement.docs";
import {
  requestCashSettlementSchema,
  reviewCashSettlementsSchema,
} from "./settlement.validator";

export const settlementRoutes = new Hono<{ Variables: AppVariables }>();

settlementRoutes.get(
  "/:paymentId/settlements",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(settlementDocs.listByPayment),
  (c) => settlementController.listByPayment(c),
);

settlementRoutes.post(
  "/:paymentId/settlements/cash",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(settlementDocs.requestCash),
  validator("json", requestCashSettlementSchema),
  (c) => settlementController.requestCash(c),
);

settlementRoutes.post(
  "/:paymentId/settlements/confirm",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(settlementDocs.confirmCash),
  validator("json", reviewCashSettlementsSchema),
  (c) => settlementController.confirmCash(c),
);

settlementRoutes.post(
  "/:paymentId/settlements/reject",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(settlementDocs.rejectCash),
  validator("json", reviewCashSettlementsSchema),
  (c) => settlementController.rejectCash(c),
);
