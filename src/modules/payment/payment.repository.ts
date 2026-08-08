import { and, desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "../../db";
import {
  payment,
  paymentItem,
  paymentItemAssignment,
  paymentParticipant,
  paymentSplit,
} from "../../db/schema/payments";
import type {
  AddParticipantInput,
  CreatePaymentInput,
  CreatePaymentItemInput,
  UpdatePaymentInput,
} from "./payment.types";

export function allocateEqualCents(totalCents: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  );
}

export const paymentRepository = {
  async create(userId: string, input: CreatePaymentInput) {
    const paymentId = crypto.randomUUID();
    const participantId = crypto.randomUUID();

    return db.transaction(async (tx) => {
      const [record] = await tx
        .insert(payment)
        .values({
          id: paymentId,
          createdBy: userId,
          title: input.title,
          description: input.description ?? null,
          currency: input.currency,
          totalAmountCents: input.totalAmountCents,
          taxAmountCents: input.taxAmountCents,
          tipAmountCents: input.tipAmountCents,
          discountAmountCents: input.discountAmountCents,
          splitMethod: input.splitMethod,
          dueAt: input.dueAt ?? null,
          locationName: input.locationName ?? null,
          receiptImageUrl: input.receiptImageUrl ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!record) {
        return null;
      }

      await tx.insert(paymentParticipant).values({
        id: participantId,
        paymentId,
        userId,
        addedBy: userId,
        isOwner: true,
        isActive: true,
      });

      return record;
    });
  },

  async findById(id: string) {
    const [record] = await db
      .select()
      .from(payment)
      .where(eq(payment.id, id))
      .limit(1);

    return record ?? null;
  },

  async updateDraft(paymentId: string, input: UpdatePaymentInput) {
    const [record] = await db
      .update(payment)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.totalAmountCents !== undefined
          ? { totalAmountCents: input.totalAmountCents }
          : {}),
        ...(input.taxAmountCents !== undefined
          ? { taxAmountCents: input.taxAmountCents }
          : {}),
        ...(input.tipAmountCents !== undefined
          ? { tipAmountCents: input.tipAmountCents }
          : {}),
        ...(input.discountAmountCents !== undefined
          ? { discountAmountCents: input.discountAmountCents }
          : {}),
        ...(input.splitMethod !== undefined
          ? { splitMethod: input.splitMethod }
          : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.locationName !== undefined
          ? { locationName: input.locationName }
          : {}),
        ...(input.receiptImageUrl !== undefined
          ? { receiptImageUrl: input.receiptImageUrl }
          : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      })
      .where(eq(payment.id, paymentId))
      .returning();

    return record ?? null;
  },

  async finalize(paymentId: string) {
    const [record] = await db
      .update(payment)
      .set({
        status: "finalized",
        finalizedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
      .returning();

    return record ?? null;
  },

  async findActiveParticipant(paymentId: string, userId: string) {
    const [record] = await db
      .select()
      .from(paymentParticipant)
      .where(
        and(
          eq(paymentParticipant.paymentId, paymentId),
          eq(paymentParticipant.userId, userId),
          eq(paymentParticipant.isActive, true),
        ),
      )
      .limit(1);

    return record ?? null;
  },

  async findParticipant(paymentId: string, userId: string) {
    const [record] = await db
      .select()
      .from(paymentParticipant)
      .where(
        and(
          eq(paymentParticipant.paymentId, paymentId),
          eq(paymentParticipant.userId, userId),
        ),
      )
      .limit(1);

    return record ?? null;
  },

  async listForUser(userId: string) {
    const rows = await db
      .select({ payment })
      .from(payment)
      .innerJoin(
        paymentParticipant,
        and(
          eq(paymentParticipant.paymentId, payment.id),
          eq(paymentParticipant.userId, userId),
          eq(paymentParticipant.isActive, true),
        ),
      )
      .orderBy(desc(payment.createdAt));

    return rows.map((row) => row.payment);
  },

  async listActiveParticipants(paymentId: string) {
    return db
      .select()
      .from(paymentParticipant)
      .where(
        and(
          eq(paymentParticipant.paymentId, paymentId),
          eq(paymentParticipant.isActive, true),
        ),
      );
  },

  async addParticipant(
    paymentId: string,
    addedBy: string,
    input: AddParticipantInput,
  ) {
    const existing = await this.findParticipant(paymentId, input.userId);
    if (existing) {
      if (existing.isActive) return existing;
      const [reactivated] = await db
        .update(paymentParticipant)
        .set({
          isActive: true,
          removedAt: null,
          nicknameAtTime: input.nicknameAtTime ?? existing.nicknameAtTime,
          addedBy,
          joinedAt: new Date(),
        })
        .where(eq(paymentParticipant.id, existing.id))
        .returning();
      return reactivated ?? null;
    }

    const [record] = await db
      .insert(paymentParticipant)
      .values({
        id: crypto.randomUUID(),
        paymentId,
        userId: input.userId,
        addedBy,
        isOwner: false,
        isActive: true,
        nicknameAtTime: input.nicknameAtTime ?? null,
      })
      .returning();

    return record ?? null;
  },

  async removeParticipant(paymentId: string, userId: string) {
    const [record] = await db
      .update(paymentParticipant)
      .set({
        isActive: false,
        removedAt: new Date(),
      })
      .where(
        and(
          eq(paymentParticipant.paymentId, paymentId),
          eq(paymentParticipant.userId, userId),
          eq(paymentParticipant.isActive, true),
        ),
      )
      .returning();

    return record ?? null;
  },

  async listItems(paymentId: string) {
    return db
      .select()
      .from(paymentItem)
      .where(eq(paymentItem.paymentId, paymentId))
      .orderBy(desc(paymentItem.createdAt));
  },

  async findItem(paymentId: string, itemId: string) {
    const [record] = await db
      .select()
      .from(paymentItem)
      .where(
        and(eq(paymentItem.id, itemId), eq(paymentItem.paymentId, paymentId)),
      )
      .limit(1);

    return record ?? null;
  },

  async findItemsByIds(paymentId: string, itemIds: string[]) {
    if (itemIds.length === 0) return [];
    return db
      .select()
      .from(paymentItem)
      .where(
        and(
          eq(paymentItem.paymentId, paymentId),
          inArray(paymentItem.id, itemIds),
        ),
      );
  },

  async addItem(paymentId: string, input: CreatePaymentItemInput) {
    const quantity = input.quantity ?? 1;
    const totalPriceCents = Math.round(quantity * input.unitPriceCents);

    return db.transaction(async (tx) => {
      const [item] = await tx
        .insert(paymentItem)
        .values({
          id: crypto.randomUUID(),
          paymentId,
          name: input.name,
          description: input.description ?? null,
          quantity: String(quantity),
          unitPriceCents: input.unitPriceCents,
          totalPriceCents,
          category: input.category ?? null,
        })
        .returning();

      if (!item) return null;

      await this.recomputeTotal(tx, paymentId);
      return item;
    });
  },

  async deleteItem(paymentId: string, itemId: string) {
    return db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(paymentItem)
        .where(
          and(eq(paymentItem.id, itemId), eq(paymentItem.paymentId, paymentId)),
        )
        .returning();

      if (!deleted) return null;
      await this.recomputeTotal(tx, paymentId);
      return deleted;
    });
  },

  async recomputeTotal(
    executor: Pick<typeof db, "select" | "update">,
    paymentId: string,
  ) {
    const [paymentRow] = await executor
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (!paymentRow) return null;

    const [itemsAggregate] = await executor
      .select({
        itemsTotal: sum(paymentItem.totalPriceCents),
      })
      .from(paymentItem)
      .where(eq(paymentItem.paymentId, paymentId));

    const itemsTotal = Number(itemsAggregate?.itemsTotal ?? 0);
    const totalAmountCents = Math.max(
      0,
      itemsTotal +
        paymentRow.taxAmountCents +
        paymentRow.tipAmountCents -
        paymentRow.discountAmountCents,
    );

    const [updated] = await executor
      .update(payment)
      .set({ totalAmountCents })
      .where(eq(payment.id, paymentId))
      .returning();

    return updated ?? null;
  },

  async listSplits(paymentId: string) {
    return db
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.paymentId, paymentId))
      .orderBy(desc(paymentSplit.createdAt));
  },

  async findSplitById(splitId: string) {
    const [record] = await db
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.id, splitId))
      .limit(1);

    return record ?? null;
  },

  async listSplitsOwedBy(userId: string) {
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

  async listSplitsOwedTo(userId: string) {
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
