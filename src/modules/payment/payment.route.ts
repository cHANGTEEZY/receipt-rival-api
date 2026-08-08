import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import { ajApi } from "../../shared/utils/arcjet";
import type { AppVariables } from "../../shared/types/app.types";
import { paymentController } from "./payment.controller";
import { paymentDocs } from "./payment.docs";

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();

paymentRoutes.post(
  "/",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.createPayment),
  (c) => paymentController.createPayment(c),
);

paymentRoutes.get(
  "/",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listPayments),
  (c) => paymentController.listPayments(c),
);

paymentRoutes.get(
  "/:id",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.getPayment),
  (c) => paymentController.getPayment(c),
);
