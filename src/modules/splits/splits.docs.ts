import { resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";
import {
  createEqualSplitSchema,
  createItemBasedSplitSchema,
  publicItemAssignmentSchema,
  publicSplitSchema,
} from "./splits.validator";

export const splitsTags = ["Splits"];

export const splitsErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  requestId: z.string(),
});

const splitResponseSchema = z.object({
  success: z.literal(true),
  data: publicSplitSchema,
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
      "application/json": { schema: resolver(splitsErrorSchema) },
    },
  },
};

const equalSplitRequestBody = {
  content: {
    "multipart/form-data": {
      schema: {
        type: "object" as const,
        properties: {
          paymentImage: {
            type: "string" as const,
            format: "binary" as const,
            description:
              "Optional receipt image (JPEG, PNG, WebP, HEIC; max 10MB)",
          },
          debtorUserIds: {
            type: "string" as const,
            description:
              'Optional JSON array of user ids, e.g. ["user_abc","user_def"]',
          },
          dueAt: {
            type: "string" as const,
            format: "date-time" as const,
            description: "Optional due date (ISO 8601)",
          },
        },
      },
    },
    "application/json": {
      schema: resolver(createEqualSplitSchema),
    },
  },
};

const itemBasedSplitRequestBody = {
  content: {
    "multipart/form-data": {
      schema: {
        type: "object" as const,
        required: ["assignments"],
        properties: {
          paymentImage: {
            type: "string" as const,
            format: "binary" as const,
            description:
              "Optional receipt image (JPEG, PNG, WebP, HEIC; max 10MB)",
          },
          assignments: {
            type: "string" as const,
            description:
              'Required JSON array: [{"paymentItemId":"...","participantUserIds":["..."]}]',
          },
          dueAt: {
            type: "string" as const,
            format: "date-time" as const,
            description: "Optional due date (ISO 8601)",
          },
        },
      },
    },
    "application/json": {
      schema: resolver(createItemBasedSplitSchema),
    },
  },
};

export const splitsDocs = {
  createEqualSplit: {
    tags: splitsTags,
    summary: "Create equal splits",
    description:
      "Creates equal pending splits for debtors. Replaces existing pending splits. Accepts multipart/form-data with optional paymentImage file, or JSON for backward compatibility.",
    security: [{ cookieAuth: [] }],
    requestBody: equalSplitRequestBody as OpenAPIV3_1.RequestBodyObject,
    responses: {
      201: {
        description: "Splits created",
        content: {
          "application/json": { schema: resolver(splitListResponseSchema) },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(splitsErrorSchema) },
        },
      },
      ...authErrors,
    },
  },
  createItemBasedSplit: {
    tags: splitsTags,
    summary: "Create item-based splits",
    description:
      "Assigns items to participants equally per item and creates debtor splits. Accepts multipart/form-data with optional paymentImage file, or JSON for backward compatibility.",
    security: [{ cookieAuth: [] }],
    requestBody: itemBasedSplitRequestBody as OpenAPIV3_1.RequestBodyObject,
    responses: {
      201: {
        description: "Splits and assignments created",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.literal(true),
                data: z.object({
                  splits: z.array(publicSplitSchema),
                  assignments: z.array(publicItemAssignmentSchema),
                }),
                requestId: z.string(),
              }),
            ),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: resolver(splitsErrorSchema) },
        },
      },
      ...authErrors,
    },
  },
  listByPayment: {
    tags: splitsTags,
    summary: "List payment splits",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Split list",
        content: {
          "application/json": { schema: resolver(splitListResponseSchema) },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(splitsErrorSchema) },
        },
      },
    },
  },
  getById: {
    tags: splitsTags,
    summary: "Get a split",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Split details",
        content: {
          "application/json": { schema: resolver(splitResponseSchema) },
        },
      },
      ...authErrors,
      404: {
        description: "Not found",
        content: {
          "application/json": { schema: resolver(splitsErrorSchema) },
        },
      },
    },
  },
};
