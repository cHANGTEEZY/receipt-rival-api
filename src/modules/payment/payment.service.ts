import { db } from "../../db";
import { friendsService } from "../friends/friends.service";
import { usersRepository } from "../users/users.repository";
import {
  requireOwnerDraft,
  requireParticipant,
  type ServiceError,
  type ServiceSuccess,
} from "./payment.access";
import { paymentRepository } from "./payment.repository";
import type {
  AddParticipantInput,
  CreatePaymentInput,
  CreatePaymentItemInput,
  PublicParticipant,
  PublicPayment,
  PublicPaymentItem,
  UpdatePaymentInput,
} from "./payment.types";

type PaymentRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepository.findById>>
>;
type ItemRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepository.findItem>>
>;
type ParticipantRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepository.findActiveParticipant>>
>;

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
    receiptImageFileId: record.receiptImageFileId,
    receiptImageUploadId: record.receiptImageUploadId,
    receiptImageMimeType: record.receiptImageMimeType,
    receiptImageByteSize: record.receiptImageByteSize,
    receiptImageContentHash: record.receiptImageContentHash,
    syncVersion: record.syncVersion,
    deletedAt: record.deletedAt,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicItem(record: ItemRecord): PublicPaymentItem {
  return {
    id: record.id,
    paymentId: record.paymentId,
    name: record.name,
    description: record.description,
    quantity: String(record.quantity),
    unitPriceCents: record.unitPriceCents,
    totalPriceCents: record.totalPriceCents,
    category: record.category,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicParticipant(record: ParticipantRecord): PublicParticipant {
  return {
    id: record.id,
    paymentId: record.paymentId,
    userId: record.userId,
    addedBy: record.addedBy,
    isOwner: record.isOwner,
    isActive: record.isActive,
    nicknameAtTime: record.nicknameAtTime,
    joinedAt: record.joinedAt,
    removedAt: record.removedAt,
    createdAt: record.createdAt,
  };
}

export const paymentService = {
  async createPaymentRecord(userId: string, input: CreatePaymentInput) {
    const record = await paymentRepository.create(userId, input);
    if (!record) return null;
    return toPublicPayment(record);
  },

  async getPaymentRecord(paymentId: string, userId: string) {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return null;
    return toPublicPayment(access.data);
  },

  async listPaymentRecords(userId: string) {
    const records = await paymentRepository.listForUser(userId);
    return records.map(toPublicPayment);
  },

  async updatePayment(
    paymentId: string,
    userId: string,
    input: UpdatePaymentInput,
  ): Promise<ServiceSuccess<PublicPayment> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const record = await paymentRepository.updateDraft(paymentId, input);
    if (!record) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not update payment",
        status: 400,
      };
    }

    if (
      input.taxAmountCents !== undefined ||
      input.tipAmountCents !== undefined ||
      input.discountAmountCents !== undefined
    ) {
      await paymentRepository.recomputeTotal(db, paymentId);
      const refreshed = await paymentRepository.findById(paymentId);
      if (refreshed) return { ok: true, data: toPublicPayment(refreshed) };
    }

    return { ok: true, data: toPublicPayment(record) };
  },

  async finalizePayment(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicPayment> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const record = await paymentRepository.finalize(paymentId);
    if (!record) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not finalize payment",
        status: 400,
      };
    }

    return { ok: true, data: toPublicPayment(record) };
  },

  async addItem(
    paymentId: string,
    userId: string,
    input: CreatePaymentItemInput,
  ): Promise<ServiceSuccess<PublicPaymentItem> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const item = await paymentRepository.addItem(paymentId, input);
    if (!item) {
      return {
        ok: false,
        code: "CREATE_FAILED",
        message: "Could not add payment item",
        status: 400,
      };
    }

    return { ok: true, data: toPublicItem(item) };
  },

  async listItems(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicPaymentItem[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const items = await paymentRepository.listItems(paymentId);
    return { ok: true, data: items.map(toPublicItem) };
  },

  async deleteItem(
    paymentId: string,
    itemId: string,
    userId: string,
  ): Promise<ServiceSuccess<{ id: string }> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const deleted = await paymentRepository.deleteItem(paymentId, itemId);
    if (!deleted) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Payment item not found",
        status: 404,
      };
    }

    return { ok: true, data: { id: deleted.id } };
  },

  async addParticipant(
    paymentId: string,
    userId: string,
    input: AddParticipantInput,
  ): Promise<ServiceSuccess<PublicParticipant> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    if (input.userId === userId) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Owner is already a participant",
        status: 400,
      };
    }

    const targetUser = await usersRepository.findById(input.userId);
    if (!targetUser) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }

    const areFriends = await friendsService.areAcceptedFriends(
      userId,
      input.userId,
    );
    if (!areFriends) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Can only add accepted friends as participants",
        status: 400,
      };
    }

    const participant = await paymentRepository.addParticipant(
      paymentId,
      userId,
      input,
    );
    if (!participant) {
      return {
        ok: false,
        code: "CREATE_FAILED",
        message: "Could not add participant",
        status: 400,
      };
    }

    return { ok: true, data: toPublicParticipant(participant) };
  },

  async listParticipants(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicParticipant[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const participants =
      await paymentRepository.listActiveParticipants(paymentId);
    return { ok: true, data: participants.map(toPublicParticipant) };
  },

  async removeParticipant(
    paymentId: string,
    targetUserId: string,
    userId: string,
  ): Promise<ServiceSuccess<{ userId: string }> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const participant = await paymentRepository.findActiveParticipant(
      paymentId,
      targetUserId,
    );
    if (!participant) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Participant not found",
        status: 404,
      };
    }

    if (participant.isOwner) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Cannot remove the payment owner",
        status: 400,
      };
    }

    const removed = await paymentRepository.removeParticipant(
      paymentId,
      targetUserId,
    );
    if (!removed) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not remove participant",
        status: 400,
      };
    }

    return { ok: true, data: { userId: targetUserId } };
  },
};
