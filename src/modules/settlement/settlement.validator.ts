import { z } from "zod";

export const requestCashSettlementSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .meta({
    example: { note: "Paid at dinner" },
  });

export const reviewCashSettlementsSchema = z
  .object({
    payerUserId: z
      .string()
      .min(1, "Payer user id is required")
      .meta({
        description: "Debtor who claimed they paid in cash",
        example: "user_abc123",
      }),
  })
  .meta({
    example: { payerUserId: "user_abc123" },
  });

export const publicSettlementSchema = z.object({
  id: z.string(),
  splitId: z.string(),
  paymentId: z.string(),
  payerUserId: z.string(),
  receiverUserId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  paymentMethod: z.string().nullable(),
  note: z.string().nullable(),
  status: z.enum(["pending", "confirmed", "rejected"]),
  paidAt: z.coerce.date(),
  confirmedAt: z.coerce.date().nullable(),
  rejectedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
