import type { z } from "zod";
import type {
  addParticipantSchema,
  createEqualSplitSchema,
  createItemBasedSplitSchema,
  createPaymentItemSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from "./payment.validator";

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreatePaymentItemInput = z.infer<typeof createPaymentItemSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type CreateEqualSplitInput = z.infer<typeof createEqualSplitSchema>;
export type CreateItemBasedSplitInput = z.infer<
  typeof createItemBasedSplitSchema
>;

export type PublicPayment = {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  currency: string;
  totalAmountCents: number;
  taxAmountCents: number;
  tipAmountCents: number;
  discountAmountCents: number;
  splitMethod: CreatePaymentInput["splitMethod"];
  status: "draft" | "finalized" | "completed" | "cancelled";
  dueAt: Date | null;
  locationName: string | null;
  receiptImageUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicPaymentItem = {
  id: string;
  paymentId: string;
  name: string;
  description: string | null;
  quantity: string;
  unitPriceCents: number;
  totalPriceCents: number;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicParticipant = {
  id: string;
  paymentId: string;
  userId: string;
  addedBy: string;
  isOwner: boolean;
  isActive: boolean;
  nicknameAtTime: string | null;
  joinedAt: Date;
  removedAt: Date | null;
  createdAt: Date;
};

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
