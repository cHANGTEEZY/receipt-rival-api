import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { paymentService } from "./payment.service";
import { createPaymentSchema } from "./payment.validator";

type PaymentContext = Context<{ Variables: AppVariables }>;

export const paymentController = {
  async createPayment(c: PaymentContext) {
    const currentUser = c.get("user");

    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request body must be valid JSON",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const parsed = createPaymentSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request body";
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message,
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const createPaymentRecord = await paymentService.createPaymentRecord(
      currentUser.id,
      parsed.data,
    );

    if (!createPaymentRecord) {
      return c.json(
        {
          success: false,
          error: {
            code: "CREATE_FAILED",
            message: "Error creating payment record",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    return c.json(
      {
        success: true,
        data: createPaymentRecord,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async getPayment(c: PaymentContext) {
    const currentUser = c.get("user");

    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("id");
    if (!paymentId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payment id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const record = await paymentService.getPaymentRecord(
      paymentId,
      currentUser.id,
    );

    if (!record) {
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Payment not found",
          },
          requestId: c.get("requestId"),
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: record,
      requestId: c.get("requestId"),
    });
  },

  async listPayments(c: PaymentContext) {
    const currentUser = c.get("user");

    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const records = await paymentService.listPaymentRecords(currentUser.id);

    return c.json({
      success: true,
      data: records,
      requestId: c.get("requestId"),
    });
  },
};
