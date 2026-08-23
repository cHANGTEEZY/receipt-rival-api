import {
  ImageUploadError,
  uploadPaymentReceiptImage,
} from "../../lib/file-upload";
import type { ServiceSuccess } from "./payment.access";
import { paymentRepository } from "./payment.repository";
import {
  receiptRequestHash,
  receiptSyncRepository,
  ReceiptSyncError,
} from "./receipt-sync.repository";
import type {
  ReceiptBundleInput,
  ReceiptGraph,
  ReceiptImage,
  ReceiptPullResult,
} from "./receipt-sync.types";

export type ReceiptSyncServiceError = {
  ok: false;
  code: string;
  message: string;
  status: 400 | 403 | 404 | 409 | 502;
};

function syncError(error: unknown): ReceiptSyncServiceError {
  if (error instanceof ReceiptSyncError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }
  throw error;
}

export const receiptSyncService = {
  async createBundle(
    userId: string,
    input: ReceiptBundleInput,
  ): Promise<
    | ServiceSuccess<{ graph: ReceiptGraph; replayed: boolean }>
    | ReceiptSyncServiceError
  > {
    try {
      const result = await receiptSyncRepository.createBundle(userId, input);
      return { ok: true, data: result };
    } catch (error) {
      return syncError(error);
    }
  },

  async uploadImage(
    paymentId: string,
    userId: string,
    uploadId: string,
    file: File,
  ): Promise<
    | ServiceSuccess<{ image: ReceiptImage; replayed: boolean }>
    | ReceiptSyncServiceError
  > {
    const record = await paymentRepository.findById(paymentId);
    if (!record || record.deletedAt || record.createdBy !== userId) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Payment not found",
        status: 404,
      };
    }

    const content = Buffer.from(await file.arrayBuffer());
    const contentHash = Buffer.from(
      await crypto.subtle.digest("SHA-256", content),
    ).toString("hex");
    const requestHash = await receiptRequestHash({
      paymentId,
      uploadId,
      contentHash,
      mimeType: file.type,
      byteSize: file.size,
    });
    const existing = await receiptSyncRepository.findImageOperation(
      userId,
      uploadId,
    );
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return {
          ok: false,
          code: "IDEMPOTENCY_CONFLICT",
          message: "This upload ID was already used for a different image",
          status: 409,
        };
      }
      if (existing.response) {
        return {
          ok: true,
          data: {
            image: existing.response as unknown as ReceiptImage,
            replayed: true,
          },
        };
      }
    }

    try {
      const uploaded = await uploadPaymentReceiptImage({
        paymentId,
        userId,
        file,
        uploadId,
      });
      const result = await receiptSyncRepository.saveImage(
        userId,
        paymentId,
        uploadId,
        requestHash,
        uploaded,
      );
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof ImageUploadError) {
        return {
          ok: false,
          code: error.code,
          message: error.message,
          status: error.status,
        };
      }
      return syncError(error);
    }
  },

  async pull(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<ServiceSuccess<ReceiptPullResult> | ReceiptSyncServiceError> {
    try {
      const result = await receiptSyncRepository.pull(
        userId,
        cursor,
        limit,
      );
      return { ok: true, data: result };
    } catch (error) {
      return syncError(error);
    }
  },
};
