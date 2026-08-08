import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  payment,
  paymentParticipant,
  paymentSplit,
} from "../../db/schema/payments";
import type { CreatePaymentInput } from "./payment.types";

export const paymentRepository = {
  async create(userId: string, input: CreatePaymentInput) {
    const paymentId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const splitId = crypto.randomUUID();

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

      await tx.insert(paymentSplit).values({
        id: splitId,
        paymentId,
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
};
