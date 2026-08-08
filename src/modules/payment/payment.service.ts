import { db } from "../../db";
import { friendsService } from "../friends/friends.service";
import { usersRepository } from "../users/users.repository";
import {
  allocateEqualCents,
  paymentRepository,
} from "./payment.repository";
import type {
  AddParticipantInput,
  CreateEqualSplitInput,
  CreateItemBasedSplitInput,
  CreatePaymentInput,
  CreatePaymentItemInput,
  PublicItemAssignment,
  PublicParticipant,
  PublicPayment,
  PublicPaymentItem,
  PublicSplit,
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
type SplitRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepository.findSplitById>>
>;

type ServiceError = {
  ok: false;
  code: string;
  message: string;
  status: 400 | 403 | 404;
};

type ServiceSuccess<T> = { ok: true; data: T };

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

function toPublicSplit(record: SplitRecord): PublicSplit {
  return {
    id: record.id,
    paymentId: record.paymentId,
    debtorUserId: record.debtorUserId,
    creditorUserId: record.creditorUserId,
    amountCents: record.amountCents,
    currency: record.currency,
    status: record.status,
    dueAt: record.dueAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function requireOwnerDraft(
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

async function requireParticipant(
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
      const recomputed = await paymentRepository.recomputeTotal(db, paymentId);
      if (recomputed) {
        return { ok: true, data: toPublicPayment(recomputed) };
      }
    }

    return { ok: true, data: toPublicPayment(record) };
  },

  async finalizePayment(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicPayment> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const splits = await paymentRepository.listSplits(paymentId);
    const pendingSplits = splits.filter((split) => split.status === "pending");
    if (pendingSplits.length === 0) {
      return {
        ok: false,
        code: "NO_SPLITS",
        message: "Create splits before finalizing the payment",
        status: 400,
      };
    }

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

    const target = await usersRepository.findById(input.userId);
    if (!target) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }

    const isFriend = await friendsService.areAcceptedFriends(
      userId,
      input.userId,
    );
    if (!isFriend) {
      return {
        ok: false,
        code: "NOT_FRIENDS",
        message: "You can only add accepted friends as participants",
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

    const existing = await paymentRepository.findParticipant(
      paymentId,
      targetUserId,
    );
    if (!existing || !existing.isActive) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Participant not found",
        status: 404,
      };
    }
    if (existing.isOwner) {
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

  async createEqualSplit(
    paymentId: string,
    userId: string,
    input: CreateEqualSplitInput,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const paymentRecord = access.data;
    if (paymentRecord.totalAmountCents <= 0) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Payment total must be greater than zero to create splits",
        status: 400,
      };
    }

    const participants =
      await paymentRepository.listActiveParticipants(paymentId);
    const activeUserIds = new Set(participants.map((p) => p.userId));

    let debtorUserIds = input.debtorUserIds;
    if (!debtorUserIds || debtorUserIds.length === 0) {
      debtorUserIds = participants
        .filter((participant) => !participant.isOwner)
        .map((participant) => participant.userId);
    }

    if (debtorUserIds.length === 0) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Add at least one non-owner participant before splitting",
        status: 400,
      };
    }

    for (const debtorUserId of debtorUserIds) {
      if (!activeUserIds.has(debtorUserId)) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `User ${debtorUserId} is not an active participant`,
          status: 400,
        };
      }
      if (debtorUserId === paymentRecord.createdBy) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Creditor cannot also be a debtor on the same split",
          status: 400,
        };
      }
    }

    const uniqueDebtors = [...new Set(debtorUserIds)];
    const amounts = allocateEqualCents(
      paymentRecord.totalAmountCents,
      uniqueDebtors.length,
    );
    const dueAt = input.dueAt ?? paymentRecord.dueAt;

    const splits = uniqueDebtors
      .map((debtorUserId, index) => ({
        debtorUserId,
        creditorUserId: paymentRecord.createdBy,
        amountCents: amounts[index] ?? 0,
        currency: paymentRecord.currency,
        dueAt,
      }))
      .filter((split) => split.amountCents > 0);

    if (splits.length === 0) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Computed split amounts must be greater than zero",
        status: 400,
      };
    }

    const created = await paymentRepository.replacePendingSplits(
      paymentId,
      splits,
      "equal",
    );

    return { ok: true, data: created.map(toPublicSplit) };
  },

  async createItemBasedSplit(
    paymentId: string,
    userId: string,
    input: CreateItemBasedSplitInput,
  ): Promise<
    ServiceSuccess<{
      splits: PublicSplit[];
      assignments: PublicItemAssignment[];
    }> | ServiceError
  > {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const paymentRecord = access.data;
    const participants =
      await paymentRepository.listActiveParticipants(paymentId);
    const activeUserIds = new Set(participants.map((p) => p.userId));

    const itemIds = input.assignments.map((a) => a.paymentItemId);
    const items = await paymentRepository.findItemsByIds(paymentId, itemIds);
    const itemById = new Map(items.map((item) => [item.id, item]));

    if (items.length !== new Set(itemIds).size) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "One or more payment items were not found on this payment",
        status: 400,
      };
    }

    const assignmentRows: Array<{
      paymentItemId: string;
      userId: string;
      shareAmountCents: number;
    }> = [];
    const totalsByUser = new Map<string, number>();

    for (const assignment of input.assignments) {
      const item = itemById.get(assignment.paymentItemId);
      if (!item) continue;

      const uniqueUsers = [...new Set(assignment.participantUserIds)];
      for (const participantUserId of uniqueUsers) {
        if (!activeUserIds.has(participantUserId)) {
          return {
            ok: false,
            code: "VALIDATION_ERROR",
            message: `User ${participantUserId} is not an active participant`,
            status: 400,
          };
        }
      }

      const shares = allocateEqualCents(item.totalPriceCents, uniqueUsers.length);
      uniqueUsers.forEach((participantUserId, index) => {
        const shareAmountCents = shares[index] ?? 0;
        assignmentRows.push({
          paymentItemId: assignment.paymentItemId,
          userId: participantUserId,
          shareAmountCents,
        });
        totalsByUser.set(
          participantUserId,
          (totalsByUser.get(participantUserId) ?? 0) + shareAmountCents,
        );
      });
    }

    const dueAt = input.dueAt ?? paymentRecord.dueAt;
    const splits = [...totalsByUser.entries()]
      .filter(([debtorUserId, amountCents]) => {
        return (
          amountCents > 0 && debtorUserId !== paymentRecord.createdBy
        );
      })
      .map(([debtorUserId, amountCents]) => ({
        debtorUserId,
        creditorUserId: paymentRecord.createdBy,
        amountCents,
        currency: paymentRecord.currency,
        dueAt,
      }));

    if (splits.length === 0) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          "Item assignments must produce at least one debtor other than the creditor",
        status: 400,
      };
    }

    const created = await paymentRepository.replaceItemBasedSplits(
      paymentId,
      assignmentRows,
      splits,
    );

    return {
      ok: true,
      data: {
        splits: created.splits.map(toPublicSplit),
        assignments: created.assignments.map((row) => ({
          id: row.id,
          paymentId: row.paymentId,
          paymentItemId: row.paymentItemId,
          userId: row.userId,
          shareAmountCents: row.shareAmountCents,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      },
    };
  },

  async listSplits(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const splits = await paymentRepository.listSplits(paymentId);
    return { ok: true, data: splits.map(toPublicSplit) };
  },

  async getSplit(
    splitId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicSplit> | ServiceError> {
    const split = await paymentRepository.findSplitById(splitId);
    if (!split) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Split not found",
        status: 404,
      };
    }

    const isParty =
      split.debtorUserId === userId || split.creditorUserId === userId;
    if (!isParty) {
      const participant = await paymentRepository.findActiveParticipant(
        split.paymentId,
        userId,
      );
      if (!participant) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Split not found",
          status: 404,
        };
      }
    }

    return { ok: true, data: toPublicSplit(split) };
  },

  async listSplitsOwedByMe(userId: string) {
    const splits = await paymentRepository.listSplitsOwedBy(userId);
    return splits.map(toPublicSplit);
  },

  async listSplitsOwedToMe(userId: string) {
    const splits = await paymentRepository.listSplitsOwedTo(userId);
    return splits.map(toPublicSplit);
  },
};

