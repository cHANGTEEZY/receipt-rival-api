import ImageKit from "imagekit";
import { env } from "../config/env";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export class ImageUploadError extends Error {
  constructor(
    message: string,
    readonly code = "IMAGE_UPLOAD_FAILED",
    readonly status: 400 | 502 = 502,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

let imageKitClient: ImageKit | null = null;

export function getImageKitClient(): ImageKit {
  if (!imageKitClient) {
    imageKitClient = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return imageKitClient;
}

function extensionForMime(mimeType: string, fileName?: string): string {
  const fromMime = MIME_TO_EXT[mimeType.toLowerCase()];
  if (fromMime) return fromMime;

  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  return "jpg";
}

async function toBuffer(file: File | Blob | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(file)) return file;
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function normalizeMimeType(file: File | Blob): string {
  if (file instanceof File && file.type) return file.type.toLowerCase();
  return "application/octet-stream";
}

export type UploadPaymentReceiptInput = {
  paymentId: string;
  userId: string;
  file: File | Blob | Buffer;
  fileName?: string;
};

export type UploadPaymentReceiptResult = {
  url: string;
  fileId: string;
};

export async function uploadPaymentReceiptImage(
  input: UploadPaymentReceiptInput,
): Promise<UploadPaymentReceiptResult> {
  const buffer = await toBuffer(input.file);
  if (buffer.byteLength === 0) {
    throw new ImageUploadError("Receipt image is empty", "INVALID_IMAGE", 400);
  }
  if (buffer.byteLength > MAX_RECEIPT_BYTES) {
    throw new ImageUploadError(
      "Receipt image must be 10MB or smaller",
      "IMAGE_TOO_LARGE",
      400,
    );
  }

  const mimeType =
    input.file instanceof File || input.file instanceof Blob
      ? normalizeMimeType(input.file)
      : "image/jpeg";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ImageUploadError(
      "Receipt image must be JPEG, PNG, WebP, or HEIC",
      "INVALID_IMAGE_TYPE",
      400,
    );
  }

  const ext = extensionForMime(
    mimeType,
    input.file instanceof File ? input.file.name : input.fileName,
  );
  const fileName = `receipt-${input.paymentId}-${Date.now()}.${ext}`;
  const folder = `/receipts/${input.paymentId}`;

  try {
    const response = await getImageKitClient().upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: false,
      overwriteFile: true,
      tags: [`payment:${input.paymentId}`, `user:${input.userId}`],
    });

    const url = response.url;
    const fileId = response.fileId;
    if (!url || !fileId) {
      throw new ImageUploadError("ImageKit upload returned an incomplete response");
    }

    return { url, fileId };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      error instanceof Error ? error.message : "Failed to upload receipt image",
    );
  }
}

export async function deletePaymentReceiptImage(fileId: string): Promise<void> {
  await getImageKitClient().deleteFile(fileId);
}

const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,}$/;

export type UploadAvatarInput = {
  userId: string;
  file: File | Blob | Buffer;
  fileName?: string;
};

export type UploadAvatarResult = {
  url: string;
  fileId: string;
};

function looksLikeFileId(value: string): boolean {
  return FILE_ID_PATTERN.test(value) && !value.includes("://") && !value.includes("/");
}

export function isImageKitFileId(value: string | null | undefined): boolean {
  return Boolean(value && looksLikeFileId(value));
}

export async function uploadUserAvatarImage(
  input: UploadAvatarInput,
): Promise<UploadAvatarResult> {
  const buffer = await toBuffer(input.file);
  if (buffer.byteLength === 0) {
    throw new ImageUploadError("Avatar image is empty", "INVALID_IMAGE", 400);
  }
  if (buffer.byteLength > MAX_RECEIPT_BYTES) {
    throw new ImageUploadError(
      "Avatar image must be 10MB or smaller",
      "IMAGE_TOO_LARGE",
      400,
    );
  }

  const mimeType =
    input.file instanceof File || input.file instanceof Blob
      ? normalizeMimeType(input.file)
      : "image/jpeg";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ImageUploadError(
      "Avatar image must be JPEG, PNG, WebP, or HEIC",
      "INVALID_IMAGE_TYPE",
      400,
    );
  }

  const ext = extensionForMime(
    mimeType,
    input.file instanceof File ? input.file.name : input.fileName,
  );
  const fileName = `avatar-${input.userId}-${Date.now()}.${ext}`;
  const folder = `/avatars/${input.userId}`;

  try {
    const response = await getImageKitClient().upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: false,
      overwriteFile: true,
      tags: [`avatar`, `user:${input.userId}`],
    });

    const url = response.url;
    const fileId = response.fileId;
    if (!url || !fileId) {
      throw new ImageUploadError("ImageKit upload returned an incomplete response");
    }

    return { url, fileId };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      error instanceof Error ? error.message : "Failed to upload avatar image",
    );
  }
}

export async function deleteUserAvatarImage(fileId: string): Promise<void> {
  if (!looksLikeFileId(fileId)) return;
  try {
    await getImageKitClient().deleteFile(fileId);
  } catch {
    // Previous file may already be gone; don't fail the new upload.
  }
}
