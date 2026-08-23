import type { Context } from "hono";
import { z } from "zod";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import {
  receiptSyncService,
  type ReceiptSyncServiceError,
} from "./receipt-sync.service";
import type {
  ReceiptBundleInput,
  ReceiptPullQuery,
} from "./receipt-sync.types";

type ReceiptSyncContext = Context<{ Variables: AppVariables }>;

function serviceError(c: ReceiptSyncContext, result: ReceiptSyncServiceError) {
  return c.json(
    {
      success: false,
      error: { code: result.code, message: result.message },
      requestId: c.get("requestId"),
    },
    result.status,
  );
}

function currentUserOrResponse(c: ReceiptSyncContext) {
  const currentUser = c.get("user");
  if (currentUser) return currentUser;
  const { body, status } = unauthorizedError(c.get("requestId"));
  return c.json(body, status);
}

export const receiptSyncController = {
  async createBundle(c: ReceiptSyncContext) {
    const currentUser = currentUserOrResponse(c);
    if (currentUser instanceof Response) return currentUser;
    const input = c.req.valid("json" as never) as ReceiptBundleInput;
    const result = await receiptSyncService.createBundle(currentUser.id, input);
    if (!result.ok) return serviceError(c, result);
    return c.json(
      {
        success: true,
        data: result.data.graph,
        replayed: result.data.replayed,
        requestId: c.get("requestId"),
      },
      result.data.replayed ? 200 : 201,
    );
  },

  async uploadImage(c: ReceiptSyncContext) {
    const currentUser = currentUserOrResponse(c);
    if (currentUser instanceof Response) return currentUser;
    const paymentId = c.req.param("paymentId");
    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Content-Type must be multipart/form-data",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const body = await c.req.parseBody({ all: true });
    const uploadValue =
      body.uploadId ?? c.req.header("idempotency-key") ?? undefined;
    const uploadId = Array.isArray(uploadValue) ? uploadValue[0] : uploadValue;
    const uploadResult = z.uuid().safeParse(uploadId);
    const imageValue = body.image ?? body.paymentImage;
    const image = Array.isArray(imageValue) ? imageValue[0] : imageValue;
    if (!paymentId || !uploadResult.success || !(image instanceof File)) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "A UUID uploadId and image file are required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await receiptSyncService.uploadImage(
      paymentId,
      currentUser.id,
      uploadResult.data,
      image,
    );
    if (!result.ok) return serviceError(c, result);
    return c.json({
      success: true,
      data: result.data.image,
      replayed: result.data.replayed,
      requestId: c.get("requestId"),
    });
  },

  async pull(c: ReceiptSyncContext) {
    const currentUser = currentUserOrResponse(c);
    if (currentUser instanceof Response) return currentUser;
    const query = c.req.valid("query" as never) as ReceiptPullQuery;
    const result = await receiptSyncService.pull(
      currentUser.id,
      query.cursor,
      query.limit,
    );
    if (!result.ok) return serviceError(c, result);
    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },
};
