import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const splitMethodEnum = pgEnum('split_method', [
  'equal',
  'percentage',
  'itemized',
  'custom',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'draft',
  'finalized',
  'completed',
  'cancelled',
]);

export const payment = pgTable(
  'payment',
  {
    id: text('id').primaryKey(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 150 }).notNull(),
    description: text('description'),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    totalAmountCents: bigint('total_amount_cents', { mode: 'number' })
      .notNull()
      .default(0),
    taxAmountCents: bigint('tax_amount_cents', { mode: 'number' })
      .notNull()
      .default(0),
    tipAmountCents: bigint('tip_amount_cents', { mode: 'number' })
      .notNull()
      .default(0),
    discountAmountCents: bigint('discount_amount_cents', { mode: 'number' })
      .notNull()
      .default(0),
    splitMethod: splitMethodEnum('split_method').notNull().default('equal'),
    status: paymentStatusEnum('status').notNull().default('draft'),
    dueAt: timestamp('due_at'),
    finalizedAt: timestamp('finalized_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    locationName: varchar('location_name', { length: 150 }),
    receiptImageUrl: text('receipt_image_url'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index('payment_createdBy_idx').on(table.createdBy),
    check(
      'payment_amounts_non_negative',
      sql`${table.totalAmountCents} >= 0
        AND ${table.taxAmountCents} >= 0
        AND ${table.tipAmountCents} >= 0
        AND ${table.discountAmountCents} >= 0`,
    ),
  ],
);

export const paymentItem = pgTable(
  'payment_item',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    quantity: numeric('quantity', { precision: 12, scale: 3 })
      .notNull()
      .default('1'),
    unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).notNull(),
    totalPriceCents: bigint('total_price_cents', { mode: 'number' }).notNull(),
    category: varchar('category', { length: 80 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index('payment_item_paymentId_idx').on(table.paymentId),
    check('item_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'item_prices_non_negative',
      sql`${table.unitPriceCents} >= 0 AND ${table.totalPriceCents} >= 0`,
    ),
  ],
);

export const paymentSplit = pgTable(
  'payment_split',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [index('payment_split_paymentId_idx').on(table.paymentId)],
);

export const paymentParticipant = pgTable(
  'payment_participant',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    addedBy: text('added_by')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    isOwner: boolean('is_owner').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    nicknameAtTime: varchar('nickname_at_time', { length: 100 }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    removedAt: timestamp('removed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('payment_participant_paymentId_idx').on(table.paymentId),
    index('payment_participant_userId_idx').on(table.userId),
    unique('unique_payment_participant').on(table.paymentId, table.userId),
  ],
);

export const paymentRelations = relations(payment, ({ one, many }) => ({
  creator: one(user, {
    fields: [payment.createdBy],
    references: [user.id],
    relationName: 'paymentCreator',
  }),
  items: many(paymentItem),
  splits: many(paymentSplit),
  participants: many(paymentParticipant),
}));

export const paymentSplitRelations = relations(paymentSplit, ({ one }) => ({
  payment: one(payment, {
    fields: [paymentSplit.paymentId],
    references: [payment.id],
  }),
}));

export const paymentItemRelations = relations(paymentItem, ({ one }) => ({
  payment: one(payment, {
    fields: [paymentItem.paymentId],
    references: [payment.id],
  }),
}));

export const paymentParticipantRelations = relations(
  paymentParticipant,
  ({ one }) => ({
    payment: one(payment, {
      fields: [paymentParticipant.paymentId],
      references: [payment.id],
    }),
    user: one(user, {
      fields: [paymentParticipant.userId],
      references: [user.id],
      relationName: 'paymentParticipantUser',
    }),
    addedByUser: one(user, {
      fields: [paymentParticipant.addedBy],
      references: [user.id],
      relationName: 'paymentParticipantAddedBy',
    }),
  }),
);
