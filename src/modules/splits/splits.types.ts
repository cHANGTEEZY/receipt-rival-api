import type { z } from "zod";
import type {
  createEqualSplitSchema,
  createItemBasedSplitSchema,
} from "./splits.validator";

export type CreateEqualSplitInput = z.infer<typeof createEqualSplitSchema>;
export type CreateItemBasedSplitInput = z.infer<
  typeof createItemBasedSplitSchema
>;

export type PublicSplit = {
  id: string;
  paymentId: string;
  debtorUserId: string;
  creditorUserId: string;
  amountCents: number;
  currency: string;
  status: "pending" | "settled" | "forgiven" | "cancelled";
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicItemAssignment = {
  id: string;
  paymentId: string;
  paymentItemId: string;
  userId: string;
  shareAmountCents: number;
  createdAt: Date;
  updatedAt: Date;
};
