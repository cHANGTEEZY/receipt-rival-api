import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { paymentSplit } from './payments';

export const settlementStatusEnum = pgEnum('settlement_status', [
  'pending',
  'confirmed',
  'rejected',
]);

export const settlement = pgTable(
  'settlement',
  {
    id: text('id').primaryKey(),
    splitId: text('split_id')
      .notNull()
      .references(() => paymentSplit.id, { onDelete: 'cascade' }),
    payerUserId: text('payer_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    receiverUserId: text('receiver_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    externalReferenceId: varchar('external_reference_id', { length: 150 }),
    note: text('note'),
    proofImageUrl: text('proof_image_url'),
    status: settlementStatusEnum('status').notNull().default('pending'),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at'),
    rejectedAt: timestamp('rejected_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index('settlement_splitId_idx').on(table.splitId),
    index('settlement_payerUserId_idx').on(table.payerUserId),
    index('settlement_receiverUserId_idx').on(table.receiverUserId),
    check('settlement_amount_positive', sql`${table.amountCents} > 0`),
    check(
      'no_self_settlement',
      sql`${table.payerUserId} <> ${table.receiverUserId}`,
    ),
  ],
);

export const settlementRelations = relations(settlement, ({ one }) => ({
  split: one(paymentSplit, {
    fields: [settlement.splitId],
    references: [paymentSplit.id],
  }),
  payer: one(user, {
    fields: [settlement.payerUserId],
    references: [user.id],
    relationName: 'settlementPayer',
  }),
  receiver: one(user, {
    fields: [settlement.receiverUserId],
    references: [user.id],
    relationName: 'settlementReceiver',
  }),
}));
