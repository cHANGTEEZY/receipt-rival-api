import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { payment } from "./payments";

export const receiptSyncOperationTypeEnum = pgEnum(
  "receipt_sync_operation_type",
  ["receipt_bundle", "receipt_image"],
);

export const receiptSyncOperation = pgTable(
  "receipt_sync_operation",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    operationType: receiptSyncOperationTypeEnum("operation_type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    paymentId: text("payment_id").references(() => payment.id, {
      onDelete: "set null",
    }),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("receipt_sync_operation_user_key").on(
      table.userId,
      table.operationType,
      table.operationId,
    ),
    index("receipt_sync_operation_payment_idx").on(table.paymentId),
  ],
);

export const receiptSyncOperationRelations = relations(
  receiptSyncOperation,
  ({ one }) => ({
    user: one(user, {
      fields: [receiptSyncOperation.userId],
      references: [user.id],
    }),
    payment: one(payment, {
      fields: [receiptSyncOperation.paymentId],
      references: [payment.id],
    }),
  }),
);
