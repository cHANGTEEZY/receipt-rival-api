import { z } from "zod";
import {
  publicParticipantSchema,
  publicPaymentItemSchema,
  publicPaymentSchema,
  splitMethodSchema,
} from "./payment.validator";
import {
  publicItemAssignmentSchema,
  publicSplitSchema,
} from "../splits/splits.validator";

const MAX_AMOUNT_CENTS = 1_000_000_000;
const entityIdSchema = z.uuid();
const amountSchema = z.number().int().min(0).max(MAX_AMOUNT_CENTS);

const bundlePaymentSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1).max(150),
  description: z.string().max(5000).nullish(),
  currency: z.string().length(3).default("USD"),
  totalAmountCents: amountSchema,
  taxAmountCents: amountSchema.default(0),
  tipAmountCents: amountSchema.default(0),
  discountAmountCents: amountSchema.default(0),
  splitMethod: splitMethodSchema,
  dueAt: z.coerce.date().nullish(),
  locationName: z.string().max(150).nullish(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const bundleParticipantSchema = z.object({
  id: entityIdSchema,
  userId: z.string().min(1),
  isOwner: z.boolean().default(false),
  nicknameAtTime: z.string().max(100).nullish(),
});

const bundleItemSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1).max(150),
  description: z.string().max(5000).nullish(),
  quantity: z.coerce.number().positive().max(1_000_000).default(1),
  unitPriceCents: amountSchema,
  totalPriceCents: amountSchema,
  category: z.string().max(80).nullish(),
});

const bundleSplitSchema = z.object({
  id: entityIdSchema,
  debtorUserId: z.string().min(1),
  creditorUserId: z.string().min(1),
  amountCents: z.number().int().positive().max(MAX_AMOUNT_CENTS),
  currency: z.string().length(3),
  dueAt: z.coerce.date().optional().nullable(),
});

const bundleAssignmentSchema = z.object({
  id: entityIdSchema,
  paymentItemId: entityIdSchema,
  userId: z.string().min(1),
  assignedQuantity: z.number().positive().max(1_000_000),
  shareAmountCents: amountSchema,
});

export const receiptBundleSchema = z
  .object({
    operationId: z.uuid(),
    payment: bundlePaymentSchema,
    participants: z.array(bundleParticipantSchema).min(2),
    items: z.array(bundleItemSchema).default([]),
    splits: z.array(bundleSplitSchema).min(1),
    assignments: z.array(bundleAssignmentSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const ids = [
      value.payment.id,
      ...value.participants.map((row) => row.id),
      ...value.items.map((row) => row.id),
      ...value.splits.map((row) => row.id),
      ...value.assignments.map((row) => row.id),
    ];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "All client-generated graph IDs must be unique",
      });
    }

    const participantUserIds = value.participants.map((row) => row.userId);
    if (new Set(participantUserIds).size !== participantUserIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Participant users must be unique",
      });
    }

    if (value.participants.filter((row) => row.isOwner).length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Exactly one participant must be marked as owner",
      });
    }

    const participantSet = new Set(participantUserIds);
    for (const split of value.splits) {
      if (!participantSet.has(split.debtorUserId)) {
        ctx.addIssue({
          code: "custom",
          path: ["splits"],
          message: `Split debtor ${split.debtorUserId} is not a participant`,
        });
      }
    }

    const itemIds = new Set(value.items.map((row) => row.id));
    for (const assignment of value.assignments) {
      if (!participantSet.has(assignment.userId)) {
        ctx.addIssue({
          code: "custom",
          path: ["assignments"],
          message: `Assignment user ${assignment.userId} is not a participant`,
        });
      }
      if (!itemIds.has(assignment.paymentItemId)) {
        ctx.addIssue({
          code: "custom",
          path: ["assignments"],
          message: `Assignment item ${assignment.paymentItemId} is not in the bundle`,
        });
      }
    }

    if (
      value.payment.splitMethod === "itemized" &&
      value.assignments.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Itemized bundles require assignments",
      });
    } else if (
      value.payment.splitMethod !== "itemized" &&
      value.assignments.length > 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Assignments are only valid for itemized bundles",
      });
    }
  });

export const receiptImageParamsSchema = z.object({
  paymentId: z.uuid(),
});

export const receiptPullQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const receiptGraphSchema = z.object({
  payment: publicPaymentSchema,
  participants: z.array(publicParticipantSchema),
  items: z.array(publicPaymentItemSchema),
  splits: z.array(publicSplitSchema),
  assignments: z.array(publicItemAssignmentSchema),
});

export const receiptImageSchema = z.object({
  paymentId: z.string(),
  uploadId: z.string(),
  fileId: z.string(),
  url: z.url(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  contentHash: z.string(),
  syncVersion: z.number().int().positive(),
});
