import { z } from "zod";

const MAX_AMOUNT_CENTS = 1_000_000_000;

export const splitMethodSchema = z
  .enum(["equal", "percentage", "itemized", "custom"])
  .meta({
    description: "How the bill should be split among participants",
    example: "equal",
  });

export const createPaymentSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(150, "Title cannot be more than 150 characters long")
      .meta({
        description: "Short name for this payment",
        example: "Dinner at Joe's",
      }),
    description: z
      .string()
      .max(5000, "Description cannot be more than 5000 characters long")
      .optional()
      .meta({
        description: "Optional notes about the payment",
        example: "Team dinner after sprint planning",
      }),
    currency: z
      .string()
      .length(3, "Currency code must be exactly 3 characters")
      .default("USD")
      .meta({
        description: "ISO 4217 currency code",
        example: "USD",
      }),
    totalAmountCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .default(0)
      .meta({
        description: "Total amount in cents",
        example: 4200,
      }),
    taxAmountCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .default(0)
      .meta({
        description: "Tax amount in cents",
        example: 300,
      }),
    tipAmountCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .default(0)
      .meta({
        description: "Tip amount in cents",
        example: 600,
      }),
    discountAmountCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .default(0)
      .meta({
        description: "Discount amount in cents",
        example: 0,
      }),
    splitMethod: splitMethodSchema.default("equal"),
    dueAt: z.coerce
      .date()
      .optional()
      .meta({
        description: "When payment is due (ISO 8601)",
        example: "2026-08-15T00:00:00.000Z",
      }),
    locationName: z
      .string()
      .max(150, "Location name cannot be more than 150 characters long")
      .optional()
      .meta({
        description: "Where the purchase happened",
        example: "Joe's Diner",
      }),
    receiptImageUrl: z
      .url()
      .optional()
      .meta({
        description: "URL of an uploaded receipt image",
        example: "https://cdn.example.com/receipts/dinner.jpg",
      }),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .meta({
        description: "Arbitrary key-value metadata",
        example: { table: "12" },
      }),
  })
  .meta({
    example: {
      title: "Dinner at Joe's",
      description: "Team dinner after sprint planning",
      currency: "USD",
      totalAmountCents: 4200,
      taxAmountCents: 300,
      tipAmountCents: 600,
      discountAmountCents: 0,
      splitMethod: "equal",
      dueAt: "2026-08-15T00:00:00.000Z",
      locationName: "Joe's Diner",
    },
  });

export const updatePaymentSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(5000).optional().nullable(),
    currency: z.string().length(3).optional(),
    totalAmountCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS).optional(),
    taxAmountCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS).optional(),
    tipAmountCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS).optional(),
    discountAmountCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .optional(),
    splitMethod: splitMethodSchema.optional(),
    dueAt: z.coerce.date().optional().nullable(),
    locationName: z.string().max(150).optional().nullable(),
    receiptImageUrl: z.url().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .meta({
    example: {
      title: "Updated dinner",
      dueAt: "2026-08-16T00:00:00.000Z",
    },
  });

export const createPaymentItemSchema = z
  .object({
    name: z.string().min(1).max(150).meta({ example: "Pepperoni Pizza" }),
    description: z.string().max(5000).optional().meta({ example: "Large" }),
    quantity: z
      .number()
      .positive()
      .max(1_000_000)
      .default(1)
      .meta({ example: 2 }),
    unitPriceCents: z
      .number()
      .int()
      .min(0)
      .max(MAX_AMOUNT_CENTS)
      .meta({ example: 1800 }),
    category: z.string().max(80).optional().meta({ example: "food" }),
  })
  .meta({
    example: {
      name: "Pepperoni Pizza",
      quantity: 2,
      unitPriceCents: 1800,
      category: "food",
    },
  });

export const addParticipantSchema = z
  .object({
    userId: z.string().min(1).meta({ example: "user_abc123" }),
    nicknameAtTime: z
      .string()
      .max(100)
      .optional()
      .meta({ example: "Sam The Snack Bandit" }),
  })
  .meta({
    example: {
      userId: "user_abc123",
      nicknameAtTime: "Sam The Snack Bandit",
    },
  });

export const publicPaymentSchema = z.object({
  id: z.string().meta({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  createdBy: z.string().meta({ example: "user_123" }),
  title: z.string().meta({ example: "Dinner at Joe's" }),
  description: z.string().nullable().meta({
    example: "Team dinner after sprint planning",
  }),
  currency: z.string().meta({ example: "USD" }),
  totalAmountCents: z.number().int().meta({ example: 4200 }),
  taxAmountCents: z.number().int().meta({ example: 300 }),
  tipAmountCents: z.number().int().meta({ example: 600 }),
  discountAmountCents: z.number().int().meta({ example: 0 }),
  splitMethod: splitMethodSchema,
  status: z
    .enum(["draft", "finalized", "completed", "cancelled"])
    .meta({ example: "draft" }),
  dueAt: z.coerce.date().nullable().meta({
    example: "2026-08-15T00:00:00.000Z",
  }),
  locationName: z.string().nullable().meta({ example: "Joe's Diner" }),
  receiptImageUrl: z.string().nullable().meta({
    example: "https://cdn.example.com/receipts/dinner.jpg",
  }),
  receiptImageFileId: z.string().nullable(),
  receiptImageUploadId: z.string().nullable(),
  receiptImageMimeType: z.string().nullable(),
  receiptImageByteSize: z.number().int().nonnegative().nullable(),
  receiptImageContentHash: z.string().nullable(),
  syncVersion: z.number().int().positive(),
  deletedAt: z.coerce.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).meta({
    example: { table: "12" },
  }),
  createdAt: z.coerce.date().meta({ example: "2026-08-08T12:00:00.000Z" }),
  updatedAt: z.coerce.date().meta({ example: "2026-08-08T12:00:00.000Z" }),
});

export const publicPaymentItemSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.string(),
  unitPriceCents: z.number().int(),
  totalPriceCents: z.number().int(),
  category: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const publicParticipantSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  userId: z.string(),
  addedBy: z.string(),
  isOwner: z.boolean(),
  isActive: z.boolean(),
  nicknameAtTime: z.string().nullable(),
  joinedAt: z.coerce.date(),
  removedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
