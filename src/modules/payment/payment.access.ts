import { paymentRepository } from "./payment.repository";

type PaymentRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepository.findById>>
>;

export type ServiceError = {
  ok: false;
  code: string;
  message: string;
  status: 400 | 403 | 404 | 502;
};

export type ServiceSuccess<T> = { ok: true; data: T };

export async function requireOwnerDraft(
  paymentId: string,
  userId: string,
): Promise<ServiceSuccess<PaymentRecord> | ServiceError> {
  const record = await paymentRepository.findById(paymentId);
  if (!record) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Payment not found",
      status: 404,
    };
  }
  if (record.createdBy !== userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the payment owner can perform this action",
      status: 403,
    };
  }
  if (record.status !== "draft") {
    return {
      ok: false,
      code: "PAYMENT_NOT_DRAFT",
      message: "Payment can only be edited while in draft status",
      status: 400,
    };
  }
  return { ok: true, data: record };
}

export async function requireParticipant(
  paymentId: string,
  userId: string,
): Promise<ServiceSuccess<PaymentRecord> | ServiceError> {
  const participant = await paymentRepository.findActiveParticipant(
    paymentId,
    userId,
  );
  if (!participant) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Payment not found",
      status: 404,
    };
  }
  const record = await paymentRepository.findById(paymentId);
  if (!record) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Payment not found",
      status: 404,
    };
  }
  return { ok: true, data: record };
}
