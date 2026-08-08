import { resolver } from "hono-openapi";
import { z } from "zod";
import { publicPaymentSchema } from "../payment/payment.validator";
import { publicSplitSchema } from "../splits/splits.validator";

export const meTags = ["Me"];

export const meErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

const paymentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicPaymentSchema),
  requestId: z.string(),
});

const splitListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicSplitSchema),
  requestId: z.string(),
});

const authErrors = {
  401: {
    description: "Not authenticated",
    content: {
      "application/json": { schema: resolver(meErrorSchema) },
    },
  },
};

export const meDocs = {
  listPayments: {
    tags: meTags,
    summary: "My payments",
    description:
      "Returns payments where the authenticated user is an active participant.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Payment list",
        content: {
          "application/json": {
            schema: resolver(paymentListResponseSchema),
          },
        },
      },
      ...authErrors,
    },
  },
  listSplitsOwedByMe: {
    tags: meTags,
    summary: "Splits I owe",
    description: "Pending splits where the authenticated user is the debtor.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Split list",
        content: {
          "application/json": {
            schema: resolver(splitListResponseSchema),
          },
        },
      },
      ...authErrors,
    },
  },
  listSplitsOwedToMe: {
    tags: meTags,
    summary: "Splits owed to me",
    description: "Pending splits where the authenticated user is the creditor.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Split list",
        content: {
          "application/json": {
            schema: resolver(splitListResponseSchema),
          },
        },
      },
      ...authErrors,
    },
  },
};
