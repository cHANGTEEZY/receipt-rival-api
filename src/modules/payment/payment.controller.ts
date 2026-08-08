import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { paymentService } from "./payment.service";
import type {
  AddParticipantInput,
  CreateEqualSplitInput,
  CreateItemBasedSplitInput,
  CreatePaymentInput,
  CreatePaymentItemInput,
  UpdatePaymentInput,
} from "./payment.types";

type PaymentContext = Context<{ Variables: AppVariables }>;

function serviceError(
  c: PaymentContext,
  result: { code: string; message: string; status: 400 | 403 | 404 },
) {
  return c.json(
    {
      success: false,
      error: { code: result.code, message: result.message },
      requestId: c.get("requestId"),
    },
    result.status,
  );
}

export const paymentController = {
  async createPayment(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const input = c.req.valid("json" as never) as CreatePaymentInput;
    const createPaymentRecord = await paymentService.createPaymentRecord(
      currentUser.id,
      input,
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

    const paymentId = c.req.param("paymentId") ?? c.req.param("id");
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

  async updatePayment(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const input = c.req.valid("json" as never) as UpdatePaymentInput;
    const result = await paymentService.updatePayment(
      paymentId,
      currentUser.id,
      input,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async finalizePayment(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const result = await paymentService.finalizePayment(
      paymentId,
      currentUser.id,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async addItem(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const input = c.req.valid("json" as never) as CreatePaymentItemInput;
    const result = await paymentService.addItem(
      paymentId,
      currentUser.id,
      input,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async listItems(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const result = await paymentService.listItems(paymentId, currentUser.id);
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async deleteItem(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
    const itemId = c.req.param("itemId");
    if (!paymentId || !itemId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payment id and item id are required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await paymentService.deleteItem(
      paymentId,
      itemId,
      currentUser.id,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async addParticipant(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const input = c.req.valid("json" as never) as AddParticipantInput;
    const result = await paymentService.addParticipant(
      paymentId,
      currentUser.id,
      input,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async listParticipants(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const result = await paymentService.listParticipants(
      paymentId,
      currentUser.id,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async removeParticipant(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
    const userId = c.req.param("userId");
    if (!paymentId || !userId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payment id and user id are required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await paymentService.removeParticipant(
      paymentId,
      userId,
      currentUser.id,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async createEqualSplit(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const input = c.req.valid("json" as never) as CreateEqualSplitInput;
    const result = await paymentService.createEqualSplit(
      paymentId,
      currentUser.id,
      input,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async createItemBasedSplit(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const input = c.req.valid("json" as never) as CreateItemBasedSplitInput;
    const result = await paymentService.createItemBasedSplit(
      paymentId,
      currentUser.id,
      input,
    );
    if (!result.ok) return serviceError(c, result);

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async listSplits(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const paymentId = c.req.param("paymentId");
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

    const result = await paymentService.listSplits(paymentId, currentUser.id);
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async getSplit(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const splitId = c.req.param("splitId");
    if (!splitId) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Split id is required",
          },
          requestId: c.get("requestId"),
        },
        400,
      );
    }

    const result = await paymentService.getSplit(splitId, currentUser.id);
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async listMyPayments(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await paymentService.listPaymentRecords(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async listSplitsOwedByMe(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await paymentService.listSplitsOwedByMe(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },

  async listSplitsOwedToMe(c: PaymentContext) {
    const currentUser = c.get("user");
    if (!currentUser) {
      const { body, status } = unauthorizedError(c.get("requestId"));
      return c.json(body, status);
    }

    const data = await paymentService.listSplitsOwedToMe(currentUser.id);
    return c.json({
      success: true,
      data,
      requestId: c.get("requestId"),
    });
  },
};
