import { paymentRepository } from "./payment.repository";
import type { CreatePaymentInput, PublicPayment } from "./payment.types";

type PaymentRecord = NonNullable<Awaited<ReturnType<typeof paymentRepository.findById>>>;

function toPublicPayment(record: PaymentRecord): PublicPayment {
  return {
    id: record.id,
    createdBy: record.createdBy,
    title: record.title,
    description: record.description,
    currency: record.currency,
    totalAmountCents: record.totalAmountCents,
    taxAmountCents: record.taxAmountCents,
    tipAmountCents: record.tipAmountCents,
    discountAmountCents: record.discountAmountCents,
    splitMethod: record.splitMethod,
    status: record.status,
    dueAt: record.dueAt,
    locationName: record.locationName,
    receiptImageUrl: record.receiptImageUrl,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const paymentService = {
  async createPaymentRecord(userId: string, input: CreatePaymentInput) {
    const record = await paymentRepository.create(userId, input);
    if (!record) return null;
    return toPublicPayment(record);
  },

  async getPaymentRecord(paymentId: string, userId: string) {
    const participant = await paymentRepository.findActiveParticipant(
      paymentId,
      userId,
    );
    if (!participant) return null;

    const record = await paymentRepository.findById(paymentId);
    if (!record) return null;

    return toPublicPayment(record);
  },

  async listPaymentRecords(userId: string) {
    const records = await paymentRepository.listForUser(userId);
    return records.map(toPublicPayment);
  },
};
