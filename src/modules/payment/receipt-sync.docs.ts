import { resolver } from "hono-openapi";
import { z } from "zod";
import { paymentErrorSchema, paymentTags } from "./payment.docs";
import {
  receiptGraphSchema,
  receiptImageSchema,
} from "./receipt-sync.validator";

const graphResponse = z.object({
  success: z.literal(true),
  data: receiptGraphSchema,
  replayed: z.boolean(),
  requestId: z.string(),
});

const imageResponse = z.object({
  success: z.literal(true),
  data: receiptImageSchema,
  replayed: z.boolean(),
  requestId: z.string(),
});

const pullResponse = z.object({
  success: z.literal(true),
  data: z.object({
    graphs: z.array(receiptGraphSchema),
    tombstones: z.array(
      z.object({
        paymentId: z.string(),
        syncVersion: z.number().int(),
        deletedAt: z.coerce.date(),
      }),
    ),
    nextCursor: z.string(),
    hasMore: z.boolean(),
  }),
  requestId: z.string(),
});

const errorContent = {
  "application/json": { schema: resolver(paymentErrorSchema) },
};

export const receiptSyncDocs = {
  createBundle: {
    tags: paymentTags,
    summary: "Atomically create an offline receipt bundle",
    description:
      "Creates a finalized payment and its complete participant, item, assignment, and split graph in one transaction. operationId is idempotent per authenticated user.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Idempotent replay",
        content: {
          "application/json": { schema: resolver(graphResponse) },
        },
      },
      201: {
        description: "Bundle created",
        content: {
          "application/json": { schema: resolver(graphResponse) },
        },
      },
      400: { description: "Invalid graph", content: errorContent },
      401: { description: "Not authenticated", content: errorContent },
      403: { description: "Authenticated user is not owner", content: errorContent },
      409: { description: "Idempotency or friendship conflict", content: errorContent },
    },
  },
  uploadImage: {
    tags: paymentTags,
    summary: "Idempotently upload a receipt image",
    description:
      "Accepts multipart image plus UUID uploadId (or Idempotency-Key header), uses a deterministic ImageKit identity, and stores fileId, URL, MIME type, size, and content hash.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Image uploaded or replayed",
        content: {
          "application/json": { schema: resolver(imageResponse) },
        },
      },
      400: { description: "Invalid upload", content: errorContent },
      401: { description: "Not authenticated", content: errorContent },
      404: { description: "Payment not found", content: errorContent },
      409: { description: "Upload ID conflict", content: errorContent },
      502: { description: "Image provider failed", content: errorContent },
    },
  },
  pull: {
    tags: paymentTags,
    summary: "Pull receipt graph changes",
    description:
      "Returns payment graphs changed after an opaque cursor, plus tombstones for deleted payments or revoked participation.",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Incremental receipt changes",
        content: {
          "application/json": { schema: resolver(pullResponse) },
        },
      },
      400: { description: "Invalid cursor", content: errorContent },
      401: { description: "Not authenticated", content: errorContent },
    },
  },
};
