import type { z } from "zod";
import type {
  createCustomSplitSchema,
  createEqualSplitSchema,
  createItemBasedSplitSchema,
  createPercentageSplitSchema,
} from "./splits.validator";

export type CreateEqualSplitInput = z.infer<typeof createEqualSplitSchema>;
export type CreateItemBasedSplitInput = z.infer<
  typeof createItemBasedSplitSchema
>;
export type CreatePercentageSplitInput = z.infer<
  typeof createPercentageSplitSchema
>;
export type CreateCustomSplitInput = z.infer<typeof createCustomSplitSchema>;

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
  assignedQuantity: number;
  shareAmountCents: number;
  createdAt: Date;
  updatedAt: Date;
};
