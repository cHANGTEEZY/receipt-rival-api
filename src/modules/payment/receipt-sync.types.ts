import type { z } from "zod";
import type {
  receiptBundleSchema,
  receiptGraphSchema,
  receiptImageSchema,
  receiptPullQuerySchema,
} from "./receipt-sync.validator";

export type ReceiptBundleInput = z.infer<typeof receiptBundleSchema>;
export type ReceiptGraph = z.infer<typeof receiptGraphSchema>;
export type ReceiptImage = z.infer<typeof receiptImageSchema>;
export type ReceiptPullQuery = z.infer<typeof receiptPullQuerySchema>;

export type ReceiptPullResult = {
  graphs: ReceiptGraph[];
  tombstones: Array<{
    paymentId: string;
    syncVersion: number;
    deletedAt: Date;
  }>;
  nextCursor: string;
  hasMore: boolean;
};
