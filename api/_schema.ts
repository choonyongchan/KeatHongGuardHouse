/**
 * @fileoverview Drizzle schema — single source of truth for the DB structure.
 * Apply changes with `bun run db:push`.
 */

import { pgTable, pgEnum, text, varchar, boolean, timestamp, integer, bigint, primaryKey, index } from 'drizzle-orm/pg-core';

export const groupVisibilityEnum = pgEnum('group_visibility', ['public', 'private']);

export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey(),
  username: text('username'),
  firstName: text('first_name').notNull(),
  // Master switch for new-group DMs. On by default.
  notify: boolean('notify').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Status is derived (shared/rules.ts statusOf); only `cancelled` is stored.
// `currentCount` is denormalised on purpose: the conditional
// `UPDATE … WHERE current_count < max_members` in _db.ts joinGroup is what
// makes joins race-free, which a COUNT(*) subquery cannot do.
export const groups = pgTable('groups', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  category: text('category').notNull().default('other'),
  creatorId: bigint('creator_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  title: text('title').notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  maxMembers: integer('max_members'),
  currentCount: integer('current_count').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  cancelled: boolean('cancelled').notNull().default(false),
  visibility: groupVisibilityEnum('visibility').notNull().default('public'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('groups_expires_at_idx').on(t.expiresAt),
]);

export const groupMembers = pgTable('group_members', {
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.userId] }),
  index('group_members_user_id_idx').on(t.userId),
]);

// Opt-outs, not opt-ins, so every category is on by default.
export const mutedCategories = pgTable('muted_categories', {
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.telegramId, { onDelete: 'cascade' }),
  category: text('category').notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.category] }),
]);
