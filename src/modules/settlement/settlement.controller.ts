import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import { settlementService } from "./settlement.service";
import type {
  RequestCashSettlementInput,
  ReviewCashSettlementsInput,
} from "./settlement.types";

type SettlementContext = Context<{ Variables: AppVariables }>;

export const settlementController = {
  async listByPayment(c: SettlementContext) {
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

    const result = await settlementService.listByPayment(
      paymentId,
      currentUser.id,
    );

    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async requestCash(c: SettlementContext) {
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

    const input = c.req.valid("json" as never) as RequestCashSettlementInput;

    const result = await settlementService.requestCash(
      paymentId,
      currentUser.id,
      input,
    );

    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json(
      {
        success: true,
        data: result.data,
        requestId: c.get("requestId"),
      },
      201,
    );
  },

  async confirmCash(c: SettlementContext) {
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

    const input = c.req.valid("json" as never) as ReviewCashSettlementsInput;

    const result = await settlementService.confirmCash(
      paymentId,
      currentUser.id,
      input,
    );

    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },

  async rejectCash(c: SettlementContext) {
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

    const input = c.req.valid("json" as never) as ReviewCashSettlementsInput;

    const result = await settlementService.rejectCash(
      paymentId,
      currentUser.id,
      input,
    );

    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.code, message: result.message },
          requestId: c.get("requestId"),
        },
        result.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },
};
