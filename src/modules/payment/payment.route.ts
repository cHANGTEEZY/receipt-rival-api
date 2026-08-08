import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { arcjetProtect } from "../../middleware/arcjet";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../shared/types/app.types";
import { ajApi } from "../../shared/utils/arcjet";
import { paymentController } from "./payment.controller";
import { paymentDocs } from "./payment.docs";
import {
  addParticipantSchema,
  createEqualSplitSchema,
  createItemBasedSplitSchema,
  createPaymentItemSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from "./payment.validator";

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();
export const splitRoutes = new Hono<{ Variables: AppVariables }>();

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

paymentRoutes.post(
  "/:paymentId/splits/equal",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.createEqualSplit),
  validator("json", createEqualSplitSchema),
  (c) => paymentController.createEqualSplit(c),
);

paymentRoutes.post(
  "/:paymentId/splits/item-based",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.createItemBasedSplit),
  validator("json", createItemBasedSplitSchema),
  (c) => paymentController.createItemBasedSplit(c),
);

paymentRoutes.get(
  "/:paymentId/splits",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listSplits),
  (c) => paymentController.listSplits(c),
);

splitRoutes.get(
  "/:splitId",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.getSplit),
  (c) => paymentController.getSplit(c),
);

export const meRoutes = new Hono<{ Variables: AppVariables }>();

meRoutes.get(
  "/payments",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listMyPayments),
  (c) => paymentController.listMyPayments(c),
);

meRoutes.get(
  "/splits/owed-by-me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listSplitsOwedByMe),
  (c) => paymentController.listSplitsOwedByMe(c),
);

meRoutes.get(
  "/splits/owed-to-me",
  arcjetProtect(ajApi),
  requireAuth(),
  describeRoute(paymentDocs.listSplitsOwedToMe),
  (c) => paymentController.listSplitsOwedToMe(c),
);
