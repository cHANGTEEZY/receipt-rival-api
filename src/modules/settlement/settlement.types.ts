export type PublicSettlement = {
  id: string;
  splitId: string;
  paymentId: string;
  payerUserId: string;
  receiverUserId: string;
  amountCents: number;
  currency: string;
  paymentMethod: string | null;
  note: string | null;
  status: "pending" | "confirmed" | "rejected";
  paidAt: Date;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestCashSettlementInput = {
  note?: string;
};

export type ReviewCashSettlementsInput = {
  payerUserId: string;
};
