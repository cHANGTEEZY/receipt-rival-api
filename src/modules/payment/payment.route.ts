import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { paymentController } from "./payment.controller";
import { paymentDocs } from "./payment.docs";
import { receiptSyncController } from "./receipt-sync.controller";
import { receiptSyncDocs } from "./receipt-sync.docs";
import {
  addParticipantSchema,
  createPaymentItemSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from "./payment.validator";
import {
  receiptBundleSchema,
  receiptPullQuerySchema,
} from "./receipt-sync.validator";

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();

paymentRoutes.post(
  "/",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.createPayment),
  validator("json", createPaymentSchema),
  (c) => paymentController.createPayment(c),
);

paymentRoutes.get(
  "/",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listPayments),
  (c) => paymentController.listPayments(c),
);

paymentRoutes.post(
  "/receipt-bundles",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(receiptSyncDocs.createBundle),
  validator("json", receiptBundleSchema),
  (c) => receiptSyncController.createBundle(c),
);

paymentRoutes.get(
  "/sync",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(receiptSyncDocs.pull),
  validator("query", receiptPullQuerySchema),
  (c) => receiptSyncController.pull(c),
);

paymentRoutes.put(
  "/:paymentId/receipt",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(receiptSyncDocs.uploadImage),
  (c) => receiptSyncController.uploadImage(c),
);

paymentRoutes.get(
  "/:paymentId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.getPayment),
  (c) => paymentController.getPayment(c),
);

paymentRoutes.patch(
  "/:paymentId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.updatePayment),
  validator("json", updatePaymentSchema),
  (c) => paymentController.updatePayment(c),
);

paymentRoutes.post(
  "/:paymentId/finalize",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.finalizePayment),
  (c) => paymentController.finalizePayment(c),
);

paymentRoutes.post(
  "/:paymentId/items",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.addItem),
  validator("json", createPaymentItemSchema),
  (c) => paymentController.addItem(c),
);

paymentRoutes.get(
  "/:paymentId/items",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listItems),
  (c) => paymentController.listItems(c),
);

paymentRoutes.delete(
  "/:paymentId/items/:itemId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.deleteItem),
  (c) => paymentController.deleteItem(c),
);

paymentRoutes.post(
  "/:paymentId/participants",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.addParticipant),
  validator("json", addParticipantSchema),
  (c) => paymentController.addParticipant(c),
);

paymentRoutes.get(
  "/:paymentId/participants",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listParticipants),
  (c) => paymentController.listParticipants(c),
);

paymentRoutes.delete(
  "/:paymentId/participants/:userId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.removeParticipant),
  (c) => paymentController.removeParticipant(c),
);
