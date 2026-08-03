/**
 * @fileoverview Drizzle schema — single source of truth for the DB structure.
 * Apply changes with `bun run db:push`.
 */

import { pgTable, pgEnum, text, boolean, timestamp, integer, bigint, primaryKey, index } from 'drizzle-orm/pg-core';

export const groupStatusEnum = pgEnum('group_status', ['open', 'full', 'expired', 'cancelled']);
export const groupVisibilityEnum = pgEnum('group_visibility', ['public', 'private']);

export type GroupStatus = (typeof groupStatusEnum.enumValues)[number];
export type GroupVisibility = (typeof groupVisibilityEnum.enumValues)[number];

export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey(),
  username: text('username'),
  firstName: text('first_name').notNull(),
  subscribed: boolean('subscribed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const foodGroups = pgTable('food_groups', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  creatorId: bigint('creator_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  title: text('title').notNull(),
  externalLink: text('external_link').notNull().default(''),
  maxMembers: integer('max_members'),
  currentCount: integer('current_count').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: groupStatusEnum('status').notNull().default('open'),
  expiryWarned: boolean('expiry_warned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  visibility: groupVisibilityEnum('visibility').notNull().default('public'),
}, (t) => [
  index('food_groups_status_visibility_idx').on(t.status, t.visibility),
  index('food_groups_creator_id_idx').on(t.creatorId),
]);

export const groupMembers = pgTable('group_members', {
  groupId: integer('group_id').notNull().references(() => foodGroups.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.userId] }),
  index('group_members_user_id_idx').on(t.userId),
]);

export const feedback = pgTable('feedback', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
