import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { payment, paymentSplit } from './payments';

export const notificationTypeEnum = pgEnum('notification_type', [
  'payment_created',
  'payment_updated',
  'split_assigned',
  'settlement_pending',
  'settlement_confirmed',
  'settlement_rejected',
  'friend_request',
  'friend_accepted',
  'reminder',
  'system',
]);

export const notification = pgTable(
  'notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    message: text('message').notNull(),
    relatedPaymentId: text('related_payment_id').references(() => payment.id, {
      onDelete: 'cascade',
    }),
    relatedSplitId: text('related_split_id').references(
      () => paymentSplit.id,
      { onDelete: 'cascade' },
    ),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('notification_userId_idx').on(table.userId),
    index('notification_relatedPaymentId_idx').on(table.relatedPaymentId),
    index('notification_relatedSplitId_idx').on(table.relatedSplitId),
  ],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
    relationName: 'notificationUser',
  }),
  relatedPayment: one(payment, {
    fields: [notification.relatedPaymentId],
    references: [payment.id],
    relationName: 'notificationRelatedPayment',
  }),
  relatedSplit: one(paymentSplit, {
    fields: [notification.relatedSplitId],
    references: [paymentSplit.id],
    relationName: 'notificationRelatedSplit',
  }),
}));
