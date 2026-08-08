import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'removed',
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'active',
  'expired',
  'accepted',
]);

export const friendship = pgTable(
  'friendship',
  {
    id: text('id').primaryKey(),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    addresseeId: text('addressee_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userLowId: text('user_low_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userHighId: text('user_high_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
    removedAt: timestamp('removed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index('friendship_requesterId_idx').on(table.requesterId),
    index('friendship_addresseeId_idx').on(table.addresseeId),
    unique('unique_friendship_pair').on(table.userLowId, table.userHighId),
    check(
      'no_self_friendship',
      sql`${table.requesterId} <> ${table.addresseeId}`,
    ),
    check(
      'normalized_friendship_order',
      sql`${table.userLowId} < ${table.userHighId}`,
    ),
  ],
);

export const friendInvite = pgTable(
  'friend_invite',
  {
    id: text('id').primaryKey(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inviteToken: text('invite_token').notNull().unique(),
    status: inviteStatusEnum('status').notNull().default('active'),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedBy: text('accepted_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('friend_invite_inviterId_idx').on(table.inviterId),
    check(
      'friend_invite_not_self',
      sql`${table.acceptedBy} IS NULL OR ${table.acceptedBy} <> ${table.inviterId}`,
    ),
  ],
);

export const friendshipRelations = relations(friendship, ({ one }) => ({
  requester: one(user, {
    fields: [friendship.requesterId],
    references: [user.id],
    relationName: 'friendshipRequester',
  }),
  addressee: one(user, {
    fields: [friendship.addresseeId],
    references: [user.id],
    relationName: 'friendshipAddressee',
  }),
}));

export const friendInviteRelations = relations(friendInvite, ({ one }) => ({
  inviter: one(user, {
    fields: [friendInvite.inviterId],
    references: [user.id],
    relationName: 'friendInviteInviter',
  }),
  acceptedByUser: one(user, {
    fields: [friendInvite.acceptedBy],
    references: [user.id],
    relationName: 'friendInviteAcceptedBy',
  }),
}));
