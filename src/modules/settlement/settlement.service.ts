import { requireParticipant } from "../payment/payment.access";
import type { ServiceError, ServiceSuccess } from "../payment/payment.access";
import { settlementRepository } from "./settlement.repository";
import type {
  PublicSettlement,
  RequestCashSettlementInput,
  ReviewCashSettlementsInput,
} from "./settlement.types";

function toPublicSettlement(record: {
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
}): PublicSettlement {
  return {
    id: record.id,
    splitId: record.splitId,
    paymentId: record.paymentId,
    payerUserId: record.payerUserId,
    receiverUserId: record.receiverUserId,
    amountCents: record.amountCents,
    currency: record.currency,
    paymentMethod: record.paymentMethod,
    note: record.note,
    status: record.status,
    paidAt: record.paidAt,
    confirmedAt: record.confirmedAt,
    rejectedAt: record.rejectedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const settlementService = {
  async listByPayment(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicSettlement[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const rows = await settlementRepository.listByPayment(paymentId);
    return { ok: true, data: rows.map(toPublicSettlement) };
  },

  async requestCash(
    paymentId: string,
    userId: string,
    input: RequestCashSettlementInput,
  ): Promise<ServiceSuccess<PublicSettlement[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    if (access.data.status !== "finalized" && access.data.status !== "completed") {
      return {
        ok: false,
        code: "PAYMENT_NOT_FINALIZED",
        message: "Cash settlement is only available after the split is finalized",
        status: 400,
      };
    }

    const pendingSplits = await settlementRepository.listPendingSplitsForDebtor(
      paymentId,
      userId,
    );

    if (pendingSplits.length === 0) {
      return {
        ok: false,
        code: "NOTHING_TO_SETTLE",
        message: "You have no pending balances on this split",
        status: 400,
      };
    }

    const existingPending = await settlementRepository.listPendingSplitIds(
      pendingSplits.map((split) => split.id),
    );
    if (existingPending.length > 0) {
      return {
        ok: false,
        code: "SETTLEMENT_PENDING",
        message: "A cash settlement is already waiting for the owner to review",
        status: 400,
      };
    }

    const created = await settlementRepository.createCashForSplits(
      pendingSplits.map((split) => ({
        splitId: split.id,
        payerUserId: split.debtorUserId,
        receiverUserId: split.creditorUserId,
        amountCents: split.amountCents,
        currency: split.currency,
        note: input.note ?? null,
      })),
    );

    const withPaymentId = created.map((row) => ({
      ...row,
      paymentId,
      note: row.note ?? null,
      paymentMethod: row.paymentMethod ?? null,
    }));

    return { ok: true, data: withPaymentId.map(toPublicSettlement) };
  },

  async confirmCash(
    paymentId: string,
    userId: string,
    input: ReviewCashSettlementsInput,
  ): Promise<ServiceSuccess<PublicSettlement[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const pending = await settlementRepository.listPendingByPayerOnPayment(
      paymentId,
      input.payerUserId,
    );

    if (pending.length === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "No pending cash settlements found for this person",
        status: 404,
      };
    }

    const unauthorized = pending.some((row) => row.receiverUserId !== userId);
    if (unauthorized) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Only the person who is owed can confirm this cash settlement",
        status: 403,
      };
    }

    const confirmed = await settlementRepository.confirmMany(
      pending.map((row) => row.id),
      pending.map((row) => row.splitId),
    );

    await settlementRepository.markPaymentCompletedIfSettled(paymentId);

    return {
      ok: true,
      data: confirmed.map((row) =>
        toPublicSettlement({
          ...row,
          paymentId,
          note: row.note ?? null,
          paymentMethod: row.paymentMethod ?? null,
        }),
      ),
    };
  },

  async rejectCash(
    paymentId: string,
    userId: string,
    input: ReviewCashSettlementsInput,
  ): Promise<ServiceSuccess<PublicSettlement[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const pending = await settlementRepository.listPendingByPayerOnPayment(
      paymentId,
      input.payerUserId,
    );

    if (pending.length === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "No pending cash settlements found for this person",
        status: 404,
      };
    }

    const unauthorized = pending.some((row) => row.receiverUserId !== userId);
    if (unauthorized) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Only the person who is owed can reject this cash settlement",
        status: 403,
      };
    }

    const rejected = await settlementRepository.rejectMany(
      pending.map((row) => row.id),
    );

    return {
      ok: true,
      data: rejected.map((row) =>
        toPublicSettlement({
          ...row,
          paymentId,
          note: row.note ?? null,
          paymentMethod: row.paymentMethod ?? null,
        }),
      ),
    };
  },
};
