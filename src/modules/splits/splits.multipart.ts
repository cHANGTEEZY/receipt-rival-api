import type { Context } from "hono";
import { z } from "zod";
import type { AppVariables } from "../../shared/types/app.types";
import type {
  CreateEqualSplitInput,
  CreateItemBasedSplitInput,
} from "./splits.types";
import {
  createEqualSplitSchema,
  createItemBasedSplitSchema,
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

function readJsonField<T>(
  body: Record<string, unknown>,
  key: string,
  schema: z.ZodType<T>,
): T | undefined {
  const raw = readOptionalString(body, key);
  if (raw === undefined) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SplitFormParseError(`${key} must be valid JSON`);
  }

  const result = schema.safeParse(parsed);
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

async function parseMultipartBody(c: SplitContext) {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return (await c.req.parseBody({ all: true })) as Record<string, unknown>;
  }

  if (contentType.includes("application/json")) {
    const json = await c.req.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new SplitFormParseError("Request body must be a JSON object");
    }
    return json as Record<string, unknown>;
  }

  throw new SplitFormParseError(
    "Content-Type must be multipart/form-data or application/json",
  );
}

export async function parseEqualSplitForm(c: SplitContext): Promise<{
  paymentImage?: File;
  input: CreateEqualSplitInput;
}> {
  const body = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const debtorUserIds = readJsonField(
    body,
    "debtorUserIds",
    z.array(z.string().min(1)).min(1),
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
  const body = await parseMultipartBody(c);
  const paymentImage = extractPaymentImage(body);

  const dueAtRaw = readOptionalString(body, "dueAt");
  const assignments = readJsonField(
    body,
    "assignments",
    z
      .array(
        z.object({
          paymentItemId: z.string().min(1),
          participantUserIds: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(1),
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
