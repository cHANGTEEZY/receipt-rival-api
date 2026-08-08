import { resolver } from "hono-openapi";
import { z } from "zod";
import {
  publicParticipantSchema,
  publicPaymentItemSchema,
  publicPaymentSchema,
} from "./payment.validator";

export const paymentTags = ["Payments"];

export const paymentErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

const paymentResponseSchema = z.object({
  success: z.literal(true),
  data: publicPaymentSchema,
  requestId: z.string(),
});

const paymentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicPaymentSchema),
  requestId: z.string(),
});

const itemResponseSchema = z.object({
  success: z.literal(true),
  data: publicPaymentItemSchema,
  requestId: z.string(),
});

const itemListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicPaymentItemSchema),
  requestId: z.string(),
});

const participantResponseSchema = z.object({
  success: z.literal(true),
  data: publicParticipantSchema,
  requestId: z.string(),
});

const participantListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(publicParticipantSchema),
  requestId: z.string(),
});

const authErrors = {
  401: {
    description: "Not authenticated",
    content: {
      "application/json": { schema: resolver(paymentErrorSchema) },
    },
  },
};

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
          "application/json": { schema: resolver(paymentResponseSchema) },
        },
      },
      400: {
        description: "Invalid request or create failed",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      ...authErrors,
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
          "application/json": { schema: resolver(paymentResponseSchema) },
        },
      },
      ...authErrors,
      404: {
        description: "Payment not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
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
          "application/json": { schema: resolver(paymentListResponseSchema) },
        },
      },
      ...authErrors,
    },
  },
  updatePayment: {
    tags: paymentTags,
    summary: "Update a draft payment",
    description: "Updates draft payment fields. Owner only.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Payment updated",
        content: {
          "application/json": { schema: resolver(paymentResponseSchema) },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      ...authErrors,
      403: {
        description: "Forbidden",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
  finalizePayment: {
    tags: paymentTags,
    summary: "Finalize a payment",
    description:
      "Marks a draft payment as finalized after splits exist. Blocks further edits.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Payment finalized",
        content: {
          "application/json": { schema: resolver(paymentResponseSchema) },
        },
      },
      400: {
        description: "Cannot finalize",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      ...authErrors,
      403: {
        description: "Forbidden",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
  addItem: {
    tags: paymentTags,
    summary: "Add payment item",
    description: "Adds an item and recomputes the payment total. Owner/draft only.",
    security: [{ cookieAuth: [] }],
    responses: {
      201: {
        description: "Item created",
        content: {
          "application/json": { schema: resolver(itemResponseSchema) },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      ...authErrors,
    },
  },
  listItems: {
    tags: paymentTags,
    summary: "List payment items",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Item list",
        content: {
          "application/json": { schema: resolver(itemListResponseSchema) },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
  deleteItem: {
    tags: paymentTags,
    summary: "Delete payment item",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Item deleted",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.object({ id: z.string() }),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
  addParticipant: {
    tags: paymentTags,
    summary: "Add participant",
    description: "Adds an accepted friend as a participant. Owner/draft only.",
    security: [{ cookieAuth: [] }],
    responses: {
      201: {
        description: "Participant added",
        content: {
          "application/json": { schema: resolver(participantResponseSchema) },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
      ...authErrors,
    },
  },
  listParticipants: {
    tags: paymentTags,
    summary: "List participants",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Participant list",
        content: {
          "application/json": {
            schema: resolver(participantListResponseSchema),
          },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
  removeParticipant: {
    tags: paymentTags,
    summary: "Remove participant",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Participant removed",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.object({ userId: z.string() }),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(paymentErrorSchema) },
        },
      },
    },
  },
};
