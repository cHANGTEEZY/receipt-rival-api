import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  payment,
  paymentItemAssignment,
  paymentSplit,
} from "../../db/schema/payments";

export function allocateEqualCents(totalCents: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  );
}

export const splitsRepository = {
  async listByPayment(paymentId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.paymentId, paymentId))
      .orderBy(desc(paymentSplit.createdAt));
  },

  async findById(splitId: string) {
    const [record] = await db
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.id, splitId))
      .limit(1);

    return record ?? null;
  },

  async listOwedBy(userId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(
        and(
          eq(paymentSplit.debtorUserId, userId),
          eq(paymentSplit.status, "pending"),
        ),
      )
      .orderBy(desc(paymentSplit.createdAt));
  },

  async listOwedTo(userId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(
        and(
          eq(paymentSplit.creditorUserId, userId),
          eq(paymentSplit.status, "pending"),
        ),
      )
      .orderBy(desc(paymentSplit.createdAt));
  },

  async replacePendingSplits(
    paymentId: string,
    splits: Array<{
      debtorUserId: string;
      creditorUserId: string;
      amountCents: number;
      currency: string;
      dueAt: Date | null;
    }>,
    splitMethod: "equal" | "itemized",
  ) {
    return db.transaction(async (tx) => {
      await tx
        .delete(paymentSplit)
        .where(
          and(
            eq(paymentSplit.paymentId, paymentId),
            eq(paymentSplit.status, "pending"),
          ),
        );

      const inserted =
        splits.length === 0
          ? []
          : await tx
              .insert(paymentSplit)
              .values(
                splits.map((split) => ({
                  id: crypto.randomUUID(),
                  paymentId,
                  debtorUserId: split.debtorUserId,
                  creditorUserId: split.creditorUserId,
                  amountCents: split.amountCents,
                  currency: split.currency,
                  status: "pending" as const,
                  dueAt: split.dueAt,
                })),
              )
              .returning();

      await tx
        .update(payment)
        .set({ splitMethod })
        .where(eq(payment.id, paymentId));

      return inserted;
    });
  },

  async replaceItemBasedSplits(
    paymentId: string,
    assignments: Array<{
      paymentItemId: string;
      userId: string;
      shareAmountCents: number;
    }>,
    splits: Array<{
      debtorUserId: string;
      creditorUserId: string;
      amountCents: number;
      currency: string;
      dueAt: Date | null;
    }>,
  ) {
    return db.transaction(async (tx) => {
      await tx
        .delete(paymentItemAssignment)
        .where(eq(paymentItemAssignment.paymentId, paymentId));

      const insertedAssignments =
        assignments.length === 0
          ? []
          : await tx
              .insert(paymentItemAssignment)
              .values(
                assignments.map((assignment) => ({
                  id: crypto.randomUUID(),
                  paymentId,
                  paymentItemId: assignment.paymentItemId,
                  userId: assignment.userId,
                  shareAmountCents: assignment.shareAmountCents,
                })),
              )
              .returning();

      await tx
        .delete(paymentSplit)
        .where(
          and(
            eq(paymentSplit.paymentId, paymentId),
            eq(paymentSplit.status, "pending"),
          ),
        );

      const insertedSplits =
        splits.length === 0
          ? []
          : await tx
              .insert(paymentSplit)
              .values(
                splits.map((split) => ({
                  id: crypto.randomUUID(),
                  paymentId,
                  debtorUserId: split.debtorUserId,
                  creditorUserId: split.creditorUserId,
                  amountCents: split.amountCents,
                  currency: split.currency,
                  status: "pending" as const,
                  dueAt: split.dueAt,
                })),
              )
              .returning();

      await tx
        .update(payment)
        .set({ splitMethod: "itemized" })
        .where(eq(payment.id, paymentId));

      return { splits: insertedSplits, assignments: insertedAssignments };
    });
  },
};
