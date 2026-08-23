import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema/auth";
import { friendship } from "../../db/schema/friends";
import { payment, paymentParticipant, paymentSplit } from "../../db/schema/payments";
import type { PendingDebtRow } from "./deadbeat.types";

const COUNTED_PAYMENT_STATUSES = ["finalized", "completed"] as const;

export const deadbeatRepository = {
  async listAcceptedFriendIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({
        requesterId: friendship.requesterId,
        addresseeId: friendship.addresseeId,
      })
      .from(friendship)
      .where(
        and(
          eq(friendship.status, "accepted"),
          or(
            eq(friendship.requesterId, userId),
            eq(friendship.addresseeId, userId),
          ),
        ),
      );

    return rows.map((row) =>
      row.requesterId === userId ? row.addresseeId : row.requesterId,
    );
  },

  async listSharedPaymentIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ id: payment.id })
      .from(payment)
      .innerJoin(
        paymentParticipant,
        and(
          eq(paymentParticipant.paymentId, payment.id),
          eq(paymentParticipant.userId, userId),
          eq(paymentParticipant.isActive, true),
        ),
      )
      .where(inArray(payment.status, [...COUNTED_PAYMENT_STATUSES]));

    return rows.map((row) => row.id);
  },

  async listCoParticipantIds(paymentIds: string[]): Promise<string[]> {
    if (paymentIds.length === 0) return [];

    const rows = await db
      .select({ userId: paymentParticipant.userId })
      .from(paymentParticipant)
      .where(
        and(
          inArray(paymentParticipant.paymentId, paymentIds),
          eq(paymentParticipant.isActive, true),
        ),
      );

    return [...new Set(rows.map((row) => row.userId))];
  },

  async listPendingDebts(
    paymentIds: string[],
    debtorIds: string[],
  ): Promise<PendingDebtRow[]> {
    if (paymentIds.length === 0 || debtorIds.length === 0) return [];

    return db
      .select({
        debtorUserId: paymentSplit.debtorUserId,
        amountCents: paymentSplit.amountCents,
        currency: paymentSplit.currency,
        splitDueAt: paymentSplit.dueAt,
        paymentDueAt: payment.dueAt,
      })
      .from(paymentSplit)
      .innerJoin(payment, eq(payment.id, paymentSplit.paymentId))
      .where(
        and(
          inArray(paymentSplit.paymentId, paymentIds),
          inArray(paymentSplit.debtorUserId, debtorIds),
          eq(paymentSplit.status, "pending"),
        ),
      );
  },

  async listSettledCounts(
    paymentIds: string[],
    debtorIds: string[],
  ): Promise<Map<string, number>> {
    if (paymentIds.length === 0 || debtorIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        debtorUserId: paymentSplit.debtorUserId,
        settledCount: count(),
      })
      .from(paymentSplit)
      .where(
        and(
          inArray(paymentSplit.paymentId, paymentIds),
          inArray(paymentSplit.debtorUserId, debtorIds),
          eq(paymentSplit.status, "settled"),
        ),
      )
      .groupBy(paymentSplit.debtorUserId);

    return new Map(
      rows.map((row) => [row.debtorUserId, Number(row.settledCount)]),
    );
  },

  async listPublicUsers(userIds: string[]) {
    if (userIds.length === 0) return [];

    return db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(inArray(user.id, userIds));
  },
};
