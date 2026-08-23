import { and, asc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import { friendship } from "../../db/schema/friends";
import {
  payment,
  paymentItem,
  paymentItemAssignment,
  paymentParticipant,
  paymentSplit,
} from "../../db/schema/payments";
import { receiptSyncOperation } from "../../db/schema/receipt-sync";
import {
  allocateByWeight,
} from "../splits/splits.repository";
import type {
  ReceiptBundleInput,
  ReceiptGraph,
  ReceiptImage,
  ReceiptPullResult,
} from "./receipt-sync.types";

type DbExecutor = Pick<typeof db, "select">;

export class ReceiptSyncError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message);
    this.name = "ReceiptSyncError";
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export async function receiptRequestHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stableValue(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Buffer.from(digest).toString("hex");
}

type CursorPayload = { v: 1; after: number };

export function encodeReceiptCursor(after: number): string {
  return Buffer.from(
    JSON.stringify({ v: 1, after } satisfies CursorPayload),
  ).toString("base64url");
}

export function decodeReceiptCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<CursorPayload>;
    if (
      parsed.v !== 1 ||
      !Number.isSafeInteger(parsed.after) ||
      (parsed.after ?? -1) < 0
    ) {
      throw new Error("invalid cursor");
    }
    return parsed.after!;
  } catch {
    throw new ReceiptSyncError(
      "INVALID_CURSOR",
      "Cursor is invalid or no longer supported",
      400,
    );
  }
}

async function loadGraph(
  executor: DbExecutor,
  paymentId: string,
): Promise<ReceiptGraph> {
  const [paymentRecord] = await executor
    .select()
    .from(payment)
    .where(eq(payment.id, paymentId))
    .limit(1);
  if (!paymentRecord) {
    throw new ReceiptSyncError("NOT_FOUND", "Payment not found", 404);
  }

  const [participants, items, splits, assignments] = await Promise.all([
    executor
      .select()
      .from(paymentParticipant)
      .where(eq(paymentParticipant.paymentId, paymentId)),
    executor
      .select()
      .from(paymentItem)
      .where(eq(paymentItem.paymentId, paymentId)),
    executor
      .select()
      .from(paymentSplit)
      .where(eq(paymentSplit.paymentId, paymentId)),
    executor
      .select()
      .from(paymentItemAssignment)
      .where(eq(paymentItemAssignment.paymentId, paymentId)),
  ]);

  return {
    payment: {
      id: paymentRecord.id,
      createdBy: paymentRecord.createdBy,
      title: paymentRecord.title,
      description: paymentRecord.description,
      currency: paymentRecord.currency,
      totalAmountCents: paymentRecord.totalAmountCents,
      taxAmountCents: paymentRecord.taxAmountCents,
      tipAmountCents: paymentRecord.tipAmountCents,
      discountAmountCents: paymentRecord.discountAmountCents,
      splitMethod: paymentRecord.splitMethod,
      status: paymentRecord.status,
      dueAt: paymentRecord.dueAt,
      locationName: paymentRecord.locationName,
      receiptImageUrl: paymentRecord.receiptImageUrl,
      receiptImageFileId: paymentRecord.receiptImageFileId,
      receiptImageUploadId: paymentRecord.receiptImageUploadId,
      receiptImageMimeType: paymentRecord.receiptImageMimeType,
      receiptImageByteSize: paymentRecord.receiptImageByteSize,
      receiptImageContentHash: paymentRecord.receiptImageContentHash,
      syncVersion: paymentRecord.syncVersion,
      deletedAt: paymentRecord.deletedAt,
      metadata: paymentRecord.metadata,
      createdAt: paymentRecord.createdAt,
      updatedAt: paymentRecord.updatedAt,
    },
    participants,
    items: items.map((row) => ({ ...row, quantity: String(row.quantity) })),
    splits,
    assignments: assignments.map((row) => ({
      ...row,
      assignedQuantity: Number(row.assignedQuantity),
    })),
  };
}

function requireUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new ReceiptSyncError(
      "VALIDATION_ERROR",
      `${label} must not contain duplicates`,
    );
  }
}

function validateAndBuildGraph(input: ReceiptBundleInput, userId: string) {
  const owner = input.participants.find((row) => row.isOwner);
  if (!owner || owner.userId !== userId) {
    throw new ReceiptSyncError(
      "FORBIDDEN",
      "The authenticated user must be the bundle owner",
      403,
    );
  }

  const participantIds = new Set(input.participants.map((row) => row.userId));
  const debtorIds = input.splits.map((row) => row.debtorUserId);
  requireUnique(debtorIds, "Split debtors");
  if (debtorIds.includes(userId)) {
    throw new ReceiptSyncError(
      "VALIDATION_ERROR",
      "The payment owner cannot also be a debtor",
    );
  }
  for (const debtorId of debtorIds) {
    if (!participantIds.has(debtorId)) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        `Debtor ${debtorId} is not a participant`,
      );
    }
  }
  for (const split of input.splits) {
    if (
      split.creditorUserId !== userId ||
      split.currency !== input.payment.currency
    ) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        "Every split must use the payment owner and currency",
      );
    }
  }

  for (const item of input.items) {
    const expected = Math.round(item.quantity * item.unitPriceCents);
    if (item.totalPriceCents !== expected) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        `Item "${item.name}" total must equal quantity times unit price`,
      );
    }
  }

  if (input.items.length > 0) {
    const itemsTotal = input.items.reduce(
      (total, item) => total + item.totalPriceCents,
      0,
    );
    const computedTotal = Math.max(
      0,
      itemsTotal +
        input.payment.taxAmountCents +
        input.payment.tipAmountCents -
        input.payment.discountAmountCents,
    );
    if (computedTotal !== input.payment.totalAmountCents) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        `Payment total must equal the item total plus tax and tip minus discount (${computedTotal})`,
      );
    }
  }
  if (input.payment.totalAmountCents <= 0) {
    throw new ReceiptSyncError(
      "VALIDATION_ERROR",
      "Payment total must be greater than zero",
    );
  }

  const dueAt = input.payment.dueAt ?? null;
  const splitIds = new Map(
    input.splits.map((row) => [row.debtorUserId, row.id]),
  );
  let assignmentRows: Array<{
    id: string;
    paymentId: string;
    paymentItemId: string;
    userId: string;
    assignedQuantity: string;
    shareAmountCents: number;
  }> = [];
  let splitAmounts: Array<{ debtorUserId: string; amountCents: number }>;

  if (input.payment.splitMethod !== "itemized") {
    const suppliedTotal = input.splits.reduce(
      (sum, row) => sum + row.amountCents,
      0,
    );
    if (suppliedTotal > input.payment.totalAmountCents) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        "Split amounts cannot exceed the payment total",
      );
    }
    if (input.payment.splitMethod === "equal") {
      const expectedDebtors = input.participants
        .filter((row) => !row.isOwner)
        .map((row) => row.userId)
        .sort();
      if (
        JSON.stringify([...debtorIds].sort()) !==
        JSON.stringify(expectedDebtors)
      ) {
        throw new ReceiptSyncError(
          "VALIDATION_ERROR",
          "Equal splits must include every non-owner participant",
        );
      }
      const ownerShare = input.payment.totalAmountCents - suppliedTotal;
      const shares = [ownerShare, ...input.splits.map((row) => row.amountCents)];
      if (Math.max(...shares) - Math.min(...shares) > 1) {
        throw new ReceiptSyncError(
          "VALIDATION_ERROR",
          "Equal split amounts must divide the total across all participants",
        );
      }
    }
    splitAmounts = input.splits.map((row) => ({
      debtorUserId: row.debtorUserId,
      amountCents: row.amountCents,
    }));
  } else {
    const itemById = new Map(input.items.map((row) => [row.id, row]));
    const totalsByUser = new Map<string, number>();
    assignmentRows = [];

    for (const item of input.items) {
      const rows = input.assignments.filter(
        (row) => row.paymentItemId === item.id,
      );
      const assigned = rows.reduce(
        (sum, row) => sum + row.assignedQuantity,
        0,
      );
      if (Math.abs(assigned - item.quantity) > 0.001) {
        throw new ReceiptSyncError(
          "VALIDATION_ERROR",
          `Assigned quantity for "${item.name}" must equal ${item.quantity}`,
        );
      }
      requireUnique(
        rows.map((row) => row.userId),
        `Assignments for "${item.name}"`,
      );
      const shares = allocateByWeight(
        item.totalPriceCents,
        rows.map((row) => row.assignedQuantity),
      );
      rows.forEach((row, index) => {
        if (!participantIds.has(row.userId) || !itemById.has(row.paymentItemId)) {
          throw new ReceiptSyncError(
            "VALIDATION_ERROR",
            "Every item assignment must reference this bundle",
          );
        }
        const shareAmountCents = shares[index] ?? 0;
        if (row.shareAmountCents !== shareAmountCents) {
          throw new ReceiptSyncError(
            "VALIDATION_ERROR",
            `Assignment shares for "${item.name}" are inconsistent`,
          );
        }
        assignmentRows.push({
          id: row.id,
          paymentId: input.payment.id,
          paymentItemId: row.paymentItemId,
          userId: row.userId,
          assignedQuantity: String(row.assignedQuantity),
          shareAmountCents,
        });
        totalsByUser.set(
          row.userId,
          (totalsByUser.get(row.userId) ?? 0) + shareAmountCents,
        );
      });
    }

    const assignedUserIds = [...totalsByUser.keys()];
    const adjustedAmounts = allocateByWeight(
      input.payment.totalAmountCents,
      assignedUserIds.map((id) => totalsByUser.get(id) ?? 0),
    );
    const adjustedByUser = new Map(
      assignedUserIds.map((id, index) => [id, adjustedAmounts[index] ?? 0]),
    );
    const generatedDebtors = assignedUserIds
      .filter((id) => id !== userId && (adjustedByUser.get(id) ?? 0) > 0)
      .sort();
    const suppliedDebtors = [...debtorIds].sort();
    if (JSON.stringify(generatedDebtors) !== JSON.stringify(suppliedDebtors)) {
      throw new ReceiptSyncError(
        "VALIDATION_ERROR",
        "Itemized split IDs must be supplied for every non-owner debtor",
      );
    }
    splitAmounts = generatedDebtors.map((debtorUserId) => ({
      debtorUserId,
      amountCents: adjustedByUser.get(debtorUserId) ?? 0,
    }));
  }

  if (splitAmounts.some((row) => row.amountCents <= 0)) {
    throw new ReceiptSyncError(
      "VALIDATION_ERROR",
      "Every resulting split must be greater than zero",
    );
  }

  return {
    owner,
    friendUserIds: input.participants
      .filter((row) => !row.isOwner)
      .map((row) => row.userId),
    assignmentRows,
    splitRows: splitAmounts.map((row) => ({
      id: splitIds.get(row.debtorUserId)!,
      paymentId: input.payment.id,
      debtorUserId: row.debtorUserId,
      creditorUserId: userId,
      amountCents: row.amountCents,
      currency: input.payment.currency,
      status: "pending" as const,
      dueAt:
        input.splits.find(
          (split) => split.debtorUserId === row.debtorUserId,
        )?.dueAt ?? dueAt,
    })),
  };
}

export const receiptSyncRepository = {
  async findImageOperation(userId: string, uploadId: string) {
    const [record] = await db
      .select()
      .from(receiptSyncOperation)
      .where(
        and(
          eq(receiptSyncOperation.userId, userId),
          eq(receiptSyncOperation.operationType, "receipt_image"),
          eq(receiptSyncOperation.operationId, uploadId),
        ),
      )
      .limit(1);
    return record ?? null;
  },

  async saveImage(
    userId: string,
    paymentId: string,
    uploadId: string,
    requestHash: string,
    uploaded: Omit<ReceiptImage, "paymentId" | "uploadId" | "syncVersion">,
  ): Promise<{ image: ReceiptImage; replayed: boolean }> {
    return db.transaction(async (tx) => {
      const [claimed] = await tx
        .insert(receiptSyncOperation)
        .values({
          id: crypto.randomUUID(),
          operationId: uploadId,
          operationType: "receipt_image",
          userId,
          paymentId,
          requestHash,
        })
        .onConflictDoNothing({
          target: [
            receiptSyncOperation.userId,
            receiptSyncOperation.operationType,
            receiptSyncOperation.operationId,
          ],
        })
        .returning();

      if (!claimed) {
        const [existing] = await tx
          .select()
          .from(receiptSyncOperation)
          .where(
            and(
              eq(receiptSyncOperation.userId, userId),
              eq(receiptSyncOperation.operationType, "receipt_image"),
              eq(receiptSyncOperation.operationId, uploadId),
            ),
          )
          .limit(1);
        if (existing?.requestHash !== requestHash) {
          throw new ReceiptSyncError(
            "IDEMPOTENCY_CONFLICT",
            "This upload ID was already used for a different image",
            409,
          );
        }
        if (!existing.response) {
          throw new ReceiptSyncError(
            "IDEMPOTENCY_IN_PROGRESS",
            "The image operation is still being processed; retry shortly",
            409,
          );
        }
        return {
          image: existing.response as unknown as ReceiptImage,
          replayed: true,
        };
      }

      const [updated] = await tx
        .update(payment)
        .set({
          receiptImageUrl: uploaded.url,
          receiptImageFileId: uploaded.fileId,
          receiptImageUploadId: uploadId,
          receiptImageMimeType: uploaded.mimeType,
          receiptImageByteSize: uploaded.byteSize,
          receiptImageContentHash: uploaded.contentHash,
        })
        .where(
          and(eq(payment.id, paymentId), eq(payment.createdBy, userId)),
        )
        .returning();
      if (!updated) {
        throw new ReceiptSyncError("NOT_FOUND", "Payment not found", 404);
      }

      const image: ReceiptImage = {
        paymentId,
        uploadId,
        ...uploaded,
        syncVersion: updated.syncVersion,
      };
      await tx
        .update(receiptSyncOperation)
        .set({
          response: image as unknown as Record<string, unknown>,
          completedAt: new Date(),
        })
        .where(eq(receiptSyncOperation.id, claimed.id));
      return { image, replayed: false };
    });
  },

  async createBundle(
    userId: string,
    input: ReceiptBundleInput,
  ): Promise<{ graph: ReceiptGraph; replayed: boolean }> {
    const requestHash = await receiptRequestHash(input);
    const prepared = validateAndBuildGraph(input, userId);

    return db.transaction(async (tx) => {
      const [claimed] = await tx
        .insert(receiptSyncOperation)
        .values({
          id: crypto.randomUUID(),
          operationId: input.operationId,
          operationType: "receipt_bundle",
          userId,
          paymentId: null,
          requestHash,
        })
        .onConflictDoNothing({
          target: [
            receiptSyncOperation.userId,
            receiptSyncOperation.operationType,
            receiptSyncOperation.operationId,
          ],
        })
        .returning();

      if (!claimed) {
        const [existing] = await tx
          .select()
          .from(receiptSyncOperation)
          .where(
            and(
              eq(receiptSyncOperation.userId, userId),
              eq(receiptSyncOperation.operationType, "receipt_bundle"),
              eq(receiptSyncOperation.operationId, input.operationId),
            ),
          )
          .limit(1);
        if (!existing || !existing.response) {
          throw new ReceiptSyncError(
            "IDEMPOTENCY_IN_PROGRESS",
            "The operation is still being processed; retry shortly",
            409,
          );
        }
        if (existing.requestHash !== requestHash) {
          throw new ReceiptSyncError(
            "IDEMPOTENCY_CONFLICT",
            "This operation ID was already used with a different payload",
            409,
          );
        }
        return {
          graph: existing.response as unknown as ReceiptGraph,
          replayed: true,
        };
      }

      const [paymentIdInUse] = await tx
        .select({ id: payment.id })
        .from(payment)
        .where(eq(payment.id, input.payment.id))
        .limit(1);
      if (paymentIdInUse) {
        throw new ReceiptSyncError(
          "ID_CONFLICT",
          "The payment ID is already used by another operation",
          409,
        );
      }

      if (prepared.friendUserIds.length > 0) {
        const friendships = await tx
          .select({ low: friendship.userLowId, high: friendship.userHighId })
          .from(friendship)
          .where(
            and(
              eq(friendship.status, "accepted"),
              or(
                and(
                  eq(friendship.userLowId, userId),
                  inArray(friendship.userHighId, prepared.friendUserIds),
                ),
                and(
                  eq(friendship.userHighId, userId),
                  inArray(friendship.userLowId, prepared.friendUserIds),
                ),
              ),
            ),
          );
        const accepted = new Set(
          friendships.map((row) => (row.low === userId ? row.high : row.low)),
        );
        const rejected = prepared.friendUserIds.find((id) => !accepted.has(id));
        if (rejected) {
          throw new ReceiptSyncError(
            "FRIENDSHIP_REQUIRED",
            `User ${rejected} is not an accepted friend`,
            409,
          );
        }
      }

      const now = new Date();
      await tx.insert(payment).values({
        id: input.payment.id,
        createdBy: userId,
        title: input.payment.title,
        description: input.payment.description ?? null,
        currency: input.payment.currency,
        totalAmountCents: input.payment.totalAmountCents,
        taxAmountCents: input.payment.taxAmountCents,
        tipAmountCents: input.payment.tipAmountCents,
        discountAmountCents: input.payment.discountAmountCents,
        splitMethod: input.payment.splitMethod,
        status: "finalized",
        dueAt: input.payment.dueAt ?? null,
        finalizedAt: now,
        locationName: input.payment.locationName ?? null,
        metadata: input.payment.metadata,
      });
      await tx.insert(paymentParticipant).values(
        input.participants.map((row) => ({
          id: row.id,
          paymentId: input.payment.id,
          userId: row.userId,
          addedBy: userId,
          isOwner: row.isOwner,
          isActive: true,
          nicknameAtTime: row.nicknameAtTime ?? null,
          joinedAt: now,
        })),
      );
      if (input.items.length > 0) {
        await tx.insert(paymentItem).values(
          input.items.map((row) => ({
            id: row.id,
            paymentId: input.payment.id,
            name: row.name,
            description: row.description ?? null,
            quantity: String(row.quantity),
            unitPriceCents: row.unitPriceCents,
            totalPriceCents: row.totalPriceCents,
            category: row.category ?? null,
          })),
        );
      }
      if (prepared.assignmentRows.length > 0) {
        await tx
          .insert(paymentItemAssignment)
          .values(prepared.assignmentRows);
      }
      await tx.insert(paymentSplit).values(prepared.splitRows);

      const graph = await loadGraph(tx, input.payment.id);
      await tx
        .update(receiptSyncOperation)
        .set({
          paymentId: input.payment.id,
          response: graph as unknown as Record<string, unknown>,
          completedAt: new Date(),
        })
        .where(eq(receiptSyncOperation.id, claimed.id));

      return { graph, replayed: false };
    });
  },

  async getGraph(paymentId: string) {
    return loadGraph(db, paymentId);
  },

  async pull(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<ReceiptPullResult> {
    const after = decodeReceiptCursor(cursor);
    const rows = await db
      .select({
        paymentId: payment.id,
        syncVersion: payment.syncVersion,
        deletedAt: payment.deletedAt,
        updatedAt: payment.updatedAt,
        participantActive: paymentParticipant.isActive,
        participantRemovedAt: paymentParticipant.removedAt,
      })
      .from(payment)
      .innerJoin(
        paymentParticipant,
        and(
          eq(paymentParticipant.paymentId, payment.id),
          eq(paymentParticipant.userId, userId),
        ),
      )
      .where(gt(payment.syncVersion, after))
      .orderBy(asc(payment.syncVersion))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const graphs: ReceiptGraph[] = [];
    const tombstones: ReceiptPullResult["tombstones"] = [];
    for (const row of page) {
      if (row.deletedAt || !row.participantActive) {
        tombstones.push({
          paymentId: row.paymentId,
          syncVersion: row.syncVersion,
          deletedAt:
            row.deletedAt ?? row.participantRemovedAt ?? row.updatedAt,
        });
      } else {
        graphs.push(await loadGraph(db, row.paymentId));
      }
    }

    const nextAfter = page.at(-1)?.syncVersion ?? after;
    return {
      graphs,
      tombstones,
      nextCursor: encodeReceiptCursor(nextAfter),
      hasMore,
    };
  },
};
