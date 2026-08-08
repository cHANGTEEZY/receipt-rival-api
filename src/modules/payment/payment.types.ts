import type { createPaymentSchema } from "./payment.validator";
import type { z } from "zod";

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

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
