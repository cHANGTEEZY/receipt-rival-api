import type { Context } from "hono";
import { z } from "zod";
import type { AppVariables } from "../../shared/types/app.types";
import type {
  CreateCustomSplitInput,
  CreateEqualSplitInput,
  CreateItemBasedSplitInput,
  CreatePercentageSplitInput,
} from "./splits.types";
import {
  createCustomSplitSchema,
  createEqualSplitSchema,
  createItemBasedSplitSchema,
  createPercentageSplitSchema,
  itemAllocationSchema,
} from "./splits.validator";

type SplitContext = Context<{ Variables: AppVariables }>;

export class SplitFormParseError extends Error {
  constructor(
    message: string,
    readonly issues: z.ZodIssue[] = [],
  ) {
    super(message);
    this.name = "SplitFormParseError";
  }
}

function isUploadFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function readFormField(body: Record<string, unknown>, key: string): unknown {
  const value = body[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = readFormField(body, key);
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new SplitFormParseError(`${key} must be a string`);
  }
  return value;
}

/**
 * Multipart form fields arrive as JSON-encoded strings (form fields can only
 * be strings/files), while a JSON request body already has native
 * arrays/objects. Handle both shapes so the same schema validates either.
 */
function readJsonField<T>(
  body: Record<string, unknown>,
  key: string,
  schema: z.ZodType<T>,
  isJsonBody: boolean,
): T | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") return undefined;

  let candidate: unknown = raw;
  if (!isJsonBody || typeof raw === "string") {
    if (typeof raw !== "string") {
      throw new SplitFormParseError(`${key} must be a string`);
    }
    try {
      candidate = JSON.parse(raw);
    } catch {
      throw new SplitFormParseError(`${key} must be valid JSON`);
    }
  }

  const result = schema.safeParse(candidate);
  if (!result.success) {
    throw new SplitFormParseError(`${key} is invalid`, result.error.issues);
  }
  return result.data;
}

function extractPaymentImage(body: Record<string, unknown>): File | undefined {
  const value = readFormField(body, "paymentImage");
  if (value === undefined || value === null || value === "") return undefined;
  if (!isUploadFile(value)) {
    throw new SplitFormParseError("paymentImage must be a file upload");
  }
  return value;
}

async function parseMultipartBody(
  c: SplitContext,
): Promise<{ body: Record<string, unknown>; isJsonBody: boolean }> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const body = (await c.req.parseBody({ all: true })) as Record<
      string,
      unknown
    >;
    return { body, isJsonBody: false };
  }

  if (contentType.includes("application/json")) {
    const json = await c.req.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new SplitFormParseError("Request body must be a JSON object");
    }
    return { body: json as Record<string, unknown>, isJsonBody: true };
  }

  throw new SplitFormParseError(
    "Content-Type must be multipart/form-data or application/json",
  );
}

export async function parseEqualSplitForm(c: SplitContext): Promise<{
  paymentImage?: File;
  input: CreateEqualSplitInput;
}> {
  const { body, isJsonBody } = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const debtorUserIds = readJsonField(
    body,
    "debtorUserIds",
    z.array(z.string().min(1)).min(1),
    isJsonBody,
  );

  const parsed = createEqualSplitSchema.safeParse({
    ...(debtorUserIds !== undefined ? { debtorUserIds } : {}),
    ...(dueAtRaw !== undefined ? { dueAt: dueAtRaw } : {}),
  });

  if (!parsed.success) {
    throw new SplitFormParseError("Invalid equal split payload", parsed.error.issues);
  }

  return { paymentImage, input: parsed.data };
}

export async function parseItemBasedSplitForm(c: SplitContext): Promise<{
  paymentImage?: File;
  input: CreateItemBasedSplitInput;
}> {
  const { body, isJsonBody } = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const assignments = readJsonField(
    body,
    "assignments",
    z
      .array(
        z.object({
          paymentItemId: z.string().min(1),
          allocations: z.array(itemAllocationSchema).min(1),
        }),
      )
      .min(1),
    isJsonBody,
  );

  if (!assignments) {
    throw new SplitFormParseError("assignments is required");
  }

  const parsed = createItemBasedSplitSchema.safeParse({
    assignments,
    ...(dueAtRaw !== undefined ? { dueAt: dueAtRaw } : {}),
  });

  if (!parsed.success) {
    throw new SplitFormParseError(
      "Invalid item-based split payload",
      parsed.error.issues,
    );
  }

  return { paymentImage, input: parsed.data };
}

export async function parsePercentageSplitForm(c: SplitContext): Promise<{
  paymentImage?: File;
  input: CreatePercentageSplitInput;
}> {
  const { body, isJsonBody } = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const splits = readJsonField(
    body,
    "splits",
    z
      .array(
        z.object({
          debtorUserId: z.string().min(1),
          percentage: z.number().positive().max(100),
        }),
      )
      .min(1),
    isJsonBody,
  );

  if (!splits) {
    throw new SplitFormParseError("splits is required");
  }

  const parsed = createPercentageSplitSchema.safeParse({
    splits,
    ...(dueAtRaw !== undefined ? { dueAt: dueAtRaw } : {}),
  });

  if (!parsed.success) {
    throw new SplitFormParseError(
      "Invalid percentage split payload",
      parsed.error.issues,
    );
  }

  return { paymentImage, input: parsed.data };
}

export async function parseCustomSplitForm(c: SplitContext): Promise<{
  paymentImage?: File;
  input: CreateCustomSplitInput;
}> {
  const { body, isJsonBody } = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const splits = readJsonField(
    body,
    "splits",
    z
      .array(
        z.object({
          debtorUserId: z.string().min(1),
          amountCents: z.number().int().positive(),
        }),
      )
      .min(1),
    isJsonBody,
  );

  if (!splits) {
    throw new SplitFormParseError("splits is required");
  }

  const parsed = createCustomSplitSchema.safeParse({
    splits,
    ...(dueAtRaw !== undefined ? { dueAt: dueAtRaw } : {}),
  });

  if (!parsed.success) {
    throw new SplitFormParseError(
      "Invalid custom split payload",
      parsed.error.issues,
    );
  }

  return { paymentImage, input: parsed.data };
}
