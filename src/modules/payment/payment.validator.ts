import { z } from "zod";

export const splitMethodSchema = z.enum([
  "equal",
  "percentage",
  "itemized",
  "custom",
]);

export const createPaymentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(150, "Title cannot be more than 150 characters long"),
  description: z
    .string()
    .max(5000, "Description cannot be more than 5000 characters long")
    .optional(),
  currency: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .default("USD"),
  totalAmountCents: z.number().int().min(0).default(0),
  taxAmountCents: z.number().int().min(0).default(0),
  tipAmountCents: z.number().int().min(0).default(0),
  discountAmountCents: z.number().int().min(0).default(0),
  splitMethod: splitMethodSchema.default("equal"),
  dueAt: z.coerce.date().optional(),
  locationName: z
    .string()
    .max(150, "Location name cannot be more than 150 characters long")
    .optional(),
  receiptImageUrl: z.url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publicPaymentSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  totalAmountCents: z.number().int(),
  taxAmountCents: z.number().int(),
  tipAmountCents: z.number().int(),
  discountAmountCents: z.number().int(),
  splitMethod: splitMethodSchema,
  status: z.enum(["draft", "finalized", "completed", "cancelled"]),
  dueAt: z.coerce.date().nullable(),
  locationName: z.string().nullable(),
  receiptImageUrl: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
