import { z } from "zod";

export const createEqualSplitSchema = z
  .object({
    debtorUserIds: z.array(z.string().min(1)).min(1).optional().meta({
      description:
        "Users who owe money. Defaults to active non-owner participants.",
      example: ["user_abc123", "user_def456"],
    }),
    dueAt: z.coerce.date().optional().meta({
      example: "2026-08-15T00:00:00.000Z",
    }),
  })
  .meta({
    example: {
      debtorUserIds: ["user_abc123"],
      dueAt: "2026-08-15T00:00:00.000Z",
    },
  });

export const itemAllocationSchema = z.object({
  userId: z.string().min(1),
  quantity: z.number().positive(),
});

export const createItemBasedSplitSchema = z
  .object({
    assignments: z
      .array(
        z.object({
          paymentItemId: z.string().min(1),
          allocations: z.array(itemAllocationSchema).min(1),
        }),
      )
      .min(1),
    dueAt: z.coerce.date().optional(),
  })
  .meta({
    example: {
      assignments: [
        {
          paymentItemId: "item_123",
          allocations: [
            { userId: "user_abc123", quantity: 2 },
            { userId: "user_def456", quantity: 1 },
          ],
        },
      ],
      dueAt: "2026-08-15T00:00:00.000Z",
    },
  });

export const createPercentageSplitSchema = z
  .object({
    splits: z
      .array(
        z.object({
          debtorUserId: z.string().min(1),
          percentage: z.number().positive().max(100),
        }),
      )
      .min(1),
    dueAt: z.coerce.date().optional(),
  })
  .meta({
    example: {
      splits: [
        { debtorUserId: "user_abc123", percentage: 60 },
        { debtorUserId: "user_def456", percentage: 40 },
      ],
      dueAt: "2026-08-15T00:00:00.000Z",
    },
  });

export const createCustomSplitSchema = z
  .object({
    splits: z
      .array(
        z.object({
          debtorUserId: z.string().min(1),
          amountCents: z.number().int().positive(),
        }),
      )
      .min(1),
    dueAt: z.coerce.date().optional(),
  })
  .meta({
    example: {
      splits: [
        { debtorUserId: "user_abc123", amountCents: 1500 },
        { debtorUserId: "user_def456", amountCents: 2500 },
      ],
      dueAt: "2026-08-15T00:00:00.000Z",
    },
  });

export const publicSplitSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  debtorUserId: z.string(),
  creditorUserId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  status: z.enum(["pending", "settled", "forgiven", "cancelled"]),
  dueAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const publicItemAssignmentSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  paymentItemId: z.string(),
  userId: z.string(),
  assignedQuantity: z.number(),
  shareAmountCents: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
