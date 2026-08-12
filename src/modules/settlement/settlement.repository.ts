import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { payment, paymentSplit } from "../../db/schema/payments";
import { settlement } from "../../db/schema/settlements";

export const settlementRepository = {
  async listByPayment(paymentId: string) {
    return db
      .select({
        id: settlement.id,
        splitId: settlement.splitId,
        paymentId: paymentSplit.paymentId,
        payerUserId: settlement.payerUserId,
        receiverUserId: settlement.receiverUserId,
        amountCents: settlement.amountCents,
        currency: settlement.currency,
        paymentMethod: settlement.paymentMethod,
        note: settlement.note,
        status: settlement.status,
        paidAt: settlement.paidAt,
        confirmedAt: settlement.confirmedAt,
        rejectedAt: settlement.rejectedAt,
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt,
      })
      .from(settlement)
      .innerJoin(paymentSplit, eq(settlement.splitId, paymentSplit.id))
      .where(eq(paymentSplit.paymentId, paymentId))
      .orderBy(desc(settlement.createdAt));
  },

  async listPendingByPayerOnPayment(paymentId: string, payerUserId: string) {
    return db
      .select({
        id: settlement.id,
        splitId: settlement.splitId,
        paymentId: paymentSplit.paymentId,
        payerUserId: settlement.payerUserId,
        receiverUserId: settlement.receiverUserId,
        amountCents: settlement.amountCents,
        currency: settlement.currency,
        paymentMethod: settlement.paymentMethod,
        note: settlement.note,
        status: settlement.status,
        paidAt: settlement.paidAt,
        confirmedAt: settlement.confirmedAt,
        rejectedAt: settlement.rejectedAt,
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt,
      })
      .from(settlement)
      .innerJoin(paymentSplit, eq(settlement.splitId, paymentSplit.id))
      .where(
        and(
          eq(paymentSplit.paymentId, paymentId),
          eq(settlement.payerUserId, payerUserId),
          eq(settlement.status, "pending"),
        ),
      );
  },

  async listPendingSplitIds(splitIds: string[]) {
    if (splitIds.length === 0) return [];
    return db
      .select({
        id: settlement.id,
        splitId: settlement.splitId,
      })
      .from(settlement)
      .where(
        and(
          inArray(settlement.splitId, splitIds),
          eq(settlement.status, "pending"),
        ),
      );
  },

  async createCashForSplits(
    rows: Array<{
      splitId: string;
      payerUserId: string;
      receiverUserId: string;
      amountCents: number;
      currency: string;
      note: string | null;
    }>,
  ) {
    if (rows.length === 0) return [];

    return db
      .insert(settlement)
      .values(
        rows.map((row) => ({
          id: crypto.randomUUID(),
          splitId: row.splitId,
          payerUserId: row.payerUserId,
          receiverUserId: row.receiverUserId,
          amountCents: row.amountCents,
          currency: row.currency,
          paymentMethod: "cash",
          note: row.note,
          status: "pending" as const,
        })),
      )
      .returning();
  },

  async confirmMany(settlementIds: string[], splitIds: string[]) {
    return db.transaction(async (tx) => {
      const now = new Date();

      const confirmed =
        settlementIds.length === 0
          ? []
          : await tx
              .update(settlement)
              .set({
                status: "confirmed",
                confirmedAt: now,
              })
              .where(inArray(settlement.id, settlementIds))
              .returning();

      if (splitIds.length > 0) {
        await tx
          .update(paymentSplit)
          .set({ status: "settled" })
          .where(inArray(paymentSplit.id, splitIds));
      }

      return confirmed;
    });
  },

  async rejectMany(settlementIds: string[]) {
    if (settlementIds.length === 0) return [];

    return db
      .update(settlement)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
      })
      .where(inArray(settlement.id, settlementIds))
      .returning();
  },

  async listSplitsByPayment(paymentId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.paymentId, paymentId));
  },

  async listPendingSplitsForDebtor(paymentId: string, debtorUserId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(
        and(
          eq(paymentSplit.paymentId, paymentId),
          eq(paymentSplit.debtorUserId, debtorUserId),
          eq(paymentSplit.status, "pending"),
        ),
      );
  },

  async markPaymentCompletedIfSettled(paymentId: string) {
    const splits = await db
      .select({ status: paymentSplit.status })
      .from(paymentSplit)
      .where(eq(paymentSplit.paymentId, paymentId));

    if (splits.length === 0) return null;

    const allDone = splits.every(
      (split) =>
        split.status === "settled" ||
        split.status === "forgiven" ||
        split.status === "cancelled",
    );

    if (!allDone) return null;

    const [record] = await db
      .update(payment)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
      .returning();

    return record ?? null;
  },
};
