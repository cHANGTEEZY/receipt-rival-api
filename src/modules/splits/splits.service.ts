import {
  requireOwnerDraft,
  requireParticipant,
  type ServiceError,
  type ServiceSuccess,
} from "../payment/payment.access";
import { paymentRepository } from "../payment/payment.repository";
import {
  ImageUploadError,
  uploadPaymentReceiptImage,
} from "../../lib/file-upload";
import {
  allocateByWeight,
  allocateEqualCents,
  splitsRepository,
} from "./splits.repository";
import type {
  CreateCustomSplitInput,
  CreateEqualSplitInput,
  CreateItemBasedSplitInput,
  CreatePercentageSplitInput,
  PublicItemAssignment,
  PublicSplit,
} from "./splits.types";

type SplitRecord = NonNullable<
  Awaited<ReturnType<typeof splitsRepository.findById>>
>;

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

async function attachReceiptImageIfPresent(
  paymentId: string,
  userId: string,
  paymentImage?: File,
): Promise<ServiceSuccess<void> | ServiceError> {
  if (!paymentImage) {
    return { ok: true, data: undefined };
  }

  try {
    const uploaded = await uploadPaymentReceiptImage({
      paymentId,
      userId,
      file: paymentImage,
    });

    const updated = await paymentRepository.updateDraft(paymentId, {
      receiptImageUrl: uploaded.url,
    });
    if (!updated) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not save receipt image on payment",
        status: 400,
      };
    }

    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        status: error.status,
      };
    }

    return {
      ok: false,
      code: "IMAGE_UPLOAD_FAILED",
      message: "Failed to upload receipt image",
      status: 502,
    };
  }
}

function validateDebtors(
  splits: Array<{ debtorUserId: string }>,
  activeUserIds: Set<string>,
  ownerId: string,
): ServiceError | null {
  const seen = new Set<string>();
  for (const split of splits) {
    if (!activeUserIds.has(split.debtorUserId)) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: `User ${split.debtorUserId} is not an active participant`,
        status: 400,
      };
    }
    if (split.debtorUserId === ownerId) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Creditor cannot also be a debtor on the same split",
        status: 400,
      };
    }
    if (seen.has(split.debtorUserId)) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: `User ${split.debtorUserId} appears more than once`,
        status: 400,
      };
    }
    seen.add(split.debtorUserId);
  }
  return null;
}

export const splitsService = {
  async createEqualSplit(
    paymentId: string,
    userId: string,
    input: CreateEqualSplitInput,
    paymentImage?: File,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const receiptResult = await attachReceiptImageIfPresent(
      paymentId,
      userId,
      paymentImage,
    );
    if (!receiptResult.ok) return receiptResult;

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

    const created = await splitsRepository.replacePendingSplits(
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
    paymentImage?: File,
  ): Promise<
    ServiceSuccess<{
      splits: PublicSplit[];
      assignments: PublicItemAssignment[];
    }> | ServiceError
  > {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const receiptResult = await attachReceiptImageIfPresent(
      paymentId,
      userId,
      paymentImage,
    );
    if (!receiptResult.ok) return receiptResult;

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
      assignedQuantity: number;
      shareAmountCents: number;
    }> = [];
    const totalsByUser = new Map<string, number>();

    for (const assignment of input.assignments) {
      const item = itemById.get(assignment.paymentItemId);
      if (!item) continue;

      const mergedAllocations = new Map<string, number>();
      for (const allocation of assignment.allocations) {
        if (!activeUserIds.has(allocation.userId)) {
          return {
            ok: false,
            code: "VALIDATION_ERROR",
            message: `User ${allocation.userId} is not an active participant`,
            status: 400,
          };
        }
        mergedAllocations.set(
          allocation.userId,
          (mergedAllocations.get(allocation.userId) ?? 0) +
            allocation.quantity,
        );
      }

      const itemQuantity = Number(item.quantity);
      const allocatedQuantity = [...mergedAllocations.values()].reduce(
        (sum, quantity) => sum + quantity,
        0,
      );
      if (Math.abs(allocatedQuantity - itemQuantity) > 0.001) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `Allocated quantity for item "${item.name}" (${allocatedQuantity}) must equal the item's quantity (${itemQuantity})`,
          status: 400,
        };
      }

      const userIds = [...mergedAllocations.keys()];
      const quantities = userIds.map((id) => mergedAllocations.get(id)!);
      const shares = allocateByWeight(item.totalPriceCents, quantities);

      userIds.forEach((participantUserId, index) => {
        const shareAmountCents = shares[index] ?? 0;
        const assignedQuantity = quantities[index] ?? 0;
        assignmentRows.push({
          paymentItemId: assignment.paymentItemId,
          userId: participantUserId,
          assignedQuantity,
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

    const created = await splitsRepository.replaceItemBasedSplits(
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
          assignedQuantity: Number(row.assignedQuantity),
          shareAmountCents: row.shareAmountCents,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      },
    };
  },

  async createPercentageSplit(
    paymentId: string,
    userId: string,
    input: CreatePercentageSplitInput,
    paymentImage?: File,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const receiptResult = await attachReceiptImageIfPresent(
      paymentId,
      userId,
      paymentImage,
    );
    if (!receiptResult.ok) return receiptResult;

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

    const debtorError = validateDebtors(
      input.splits,
      activeUserIds,
      paymentRecord.createdBy,
    );
    if (debtorError) return debtorError;

    const totalPercentage = input.splits.reduce(
      (sum, split) => sum + split.percentage,
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: `Percentages must sum to 100 (got ${totalPercentage})`,
        status: 400,
      };
    }

    const amounts = allocateByWeight(
      paymentRecord.totalAmountCents,
      input.splits.map((split) => split.percentage),
    );
    const dueAt = input.dueAt ?? paymentRecord.dueAt;

    const splits = input.splits
      .map((split, index) => ({
        debtorUserId: split.debtorUserId,
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

    const created = await splitsRepository.replacePendingSplits(
      paymentId,
      splits,
      "percentage",
    );

    return { ok: true, data: created.map(toPublicSplit) };
  },

  async createCustomSplit(
    paymentId: string,
    userId: string,
    input: CreateCustomSplitInput,
    paymentImage?: File,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireOwnerDraft(paymentId, userId);
    if (!access.ok) return access;

    const receiptResult = await attachReceiptImageIfPresent(
      paymentId,
      userId,
      paymentImage,
    );
    if (!receiptResult.ok) return receiptResult;

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

    const debtorError = validateDebtors(
      input.splits,
      activeUserIds,
      paymentRecord.createdBy,
    );
    if (debtorError) return debtorError;

    const totalAmountCents = input.splits.reduce(
      (sum, split) => sum + split.amountCents,
      0,
    );
    if (totalAmountCents !== paymentRecord.totalAmountCents) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: `Custom amounts must sum to the payment total (${paymentRecord.totalAmountCents} cents), got ${totalAmountCents}`,
        status: 400,
      };
    }

    const dueAt = input.dueAt ?? paymentRecord.dueAt;
    const splits = input.splits.map((split) => ({
      debtorUserId: split.debtorUserId,
      creditorUserId: paymentRecord.createdBy,
      amountCents: split.amountCents,
      currency: paymentRecord.currency,
      dueAt,
    }));

    const created = await splitsRepository.replacePendingSplits(
      paymentId,
      splits,
      "custom",
    );

    return { ok: true, data: created.map(toPublicSplit) };
  },

  async listByPayment(
    paymentId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicSplit[]> | ServiceError> {
    const access = await requireParticipant(paymentId, userId);
    if (!access.ok) return access;

    const splits = await splitsRepository.listByPayment(paymentId);
    return { ok: true, data: splits.map(toPublicSplit) };
  },

  async getById(
    splitId: string,
    userId: string,
  ): Promise<ServiceSuccess<PublicSplit> | ServiceError> {
    const split = await splitsRepository.findById(splitId);
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

  async listOwedByMe(userId: string) {
    const splits = await splitsRepository.listOwedBy(userId);
    return splits.map(toPublicSplit);
  },

  async listOwedToMe(userId: string) {
    const splits = await splitsRepository.listOwedTo(userId);
    return splits.map(toPublicSplit);
  },
};
