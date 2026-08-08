import { resolver } from "hono-openapi";
import { z } from "zod";
import { publicPaymentSchema } from "./payment.validator";

export const paymentTags = ["Payments"];

export const paymentResponseSchema = z.object({
  success: z.literal(true),
  data: publicPaymentSchema,
  requestId: z.string(),
});

export const paymentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicPaymentSchema),
  requestId: z.string(),
});

export const paymentErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

export const paymentDocs = {
  createPayment: {
    tags: paymentTags,
    summary: "Create a payment",
    description:
      "Creates a new draft payment for the authenticated user and adds them as the owner participant.",
    security: [{ cookieAuth: [] }],
    responses: {
      201: {
        description: "Payment created",
        content: {
          "application/json": {
            schema: resolver(paymentResponseSchema),
          },
        },
      },
      400: {
        description: "Invalid request or create failed",
        content: {
          "application/json": {
            schema: resolver(paymentErrorSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(paymentErrorSchema),
          },
        },
      },
    },
  },
  getPayment: {
    tags: paymentTags,
    summary: "Get a payment",
    description:
      "Returns a payment when the authenticated user is an active participant.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Payment details",
        content: {
          "application/json": {
            schema: resolver(paymentResponseSchema),
          },
        },
      },
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(paymentErrorSchema),
          },
        },
      },
      404: {
        description: "Payment not found",
        content: {
          "application/json": {
            schema: resolver(paymentErrorSchema),
          },
        },
      },
    },
  },
  listPayments: {
    tags: paymentTags,
    summary: "List payments",
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
      401: {
        description: "Not authenticated",
        content: {
          "application/json": {
            schema: resolver(paymentErrorSchema),
          },
        },
      },
    },
  },
};
