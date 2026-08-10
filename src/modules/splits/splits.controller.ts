import type { Context } from "hono";
import { unauthorizedError } from "../../shared/errors/http.error";
import type { AppVariables } from "../../shared/types/app.types";
import {
  parseEqualSplitForm,
  parseItemBasedSplitForm,
  SplitFormParseError,
} from "./splits.multipart";
import { splitsService } from "./splits.service";

type SplitsContext = Context<{ Variables: AppVariables }>;

function serviceError(
  c: SplitsContext,
  result: { code: string; message: string; status: 400 | 403 | 404 | 502 },
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

function formParseError(c: SplitsContext, error: SplitFormParseError) {
  return c.json(
    {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
        ...(error.issues.length > 0 ? { details: error.issues } : {}),
      },
      requestId: c.get("requestId"),
    },
    400,
  );
}

export const splitsController = {
  async createEqualSplit(c: SplitsContext) {
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

    let parsed;
    try {
      parsed = await parseEqualSplitForm(c);
    } catch (error) {
      if (error instanceof SplitFormParseError) {
        return formParseError(c, error);
      }
      throw error;
    }

    const result = await splitsService.createEqualSplit(
      paymentId,
      currentUser.id,
      parsed.input,
      parsed.paymentImage,
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

  async createItemBasedSplit(c: SplitsContext) {
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

    let parsed;
    try {
      parsed = await parseItemBasedSplitForm(c);
    } catch (error) {
      if (error instanceof SplitFormParseError) {
        return formParseError(c, error);
      }
      throw error;
    }

    const result = await splitsService.createItemBasedSplit(
      paymentId,
      currentUser.id,
      parsed.input,
      parsed.paymentImage,
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

  async listByPayment(c: SplitsContext) {
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

    const result = await splitsService.listByPayment(
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

  async getById(c: SplitsContext) {
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

    const result = await splitsService.getById(splitId, currentUser.id);
    if (!result.ok) return serviceError(c, result);

    return c.json({
      success: true,
      data: result.data,
      requestId: c.get("requestId"),
    });
  },
};
