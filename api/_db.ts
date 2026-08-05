/**
 * @fileoverview Drizzle DB client and shared query helpers.
 * Reads POSTGRES_URL from the environment (auto-wired by Vercel).
 * Schema is managed via `bun run db:push` (see drizzle.config.ts), not at runtime.
 */

import { sql as vercelSql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and, inArray, lte, ne } from 'drizzle-orm';
import * as schema from './_schema.js';

export const db = drizzle(vercelSql, { schema });

/**
 * Flips any `open`/`full` group whose `expires_at` has passed to `expired`.
 * Called before any group-listing query so `status` reflects real time.
 */
export async function expireOverdueGroups(): Promise<void> {
  await db
    .update(schema.foodGroups)
    .set({ status: 'expired' })
    .where(and(inArray(schema.foodGroups.status, ['open', 'full']), lte(schema.foodGroups.expiresAt, new Date())));
}

/**
 * Upserts a Telegram user into the `users` table.
 * Updates `username` and `first_name` on conflict to keep them fresh.
 *
 * @param telegramId - The user's numeric Telegram ID.
 * @param username - The user's @username, or null if unset.
 * @param firstName - The user's first name.
 */
export async function upsertUser(
  telegramId: number,
  username: string | null,
  firstName: string,
): Promise<void> {
  await db
    .insert(schema.users)
    .values({ telegramId, username, firstName })
    .onConflictDoUpdate({
      target: schema.users.telegramId,
      set: { username, firstName },
    });
}

/**
 * Retrieves the `subscribed` flag for a user.
 *
 * @param telegramId - The user's numeric Telegram ID.
 * @returns True if the user is subscribed, false otherwise.
 */
export async function getSubscribed(telegramId: number): Promise<boolean> {
  const [row] = await db
    .select({ subscribed: schema.users.subscribed })
    .from(schema.users)
    .where(eq(schema.users.telegramId, telegramId));
  return row?.subscribed ?? false;
}

/**
 * Updates the `subscribed` flag for a user.
 *
 * @param telegramId - The user's numeric Telegram ID.
 * @param subscribed - The desired subscription state.
 */
export async function setSubscribed(telegramId: number, subscribed: boolean): Promise<void> {
  await db.update(schema.users).set({ subscribed }).where(eq(schema.users.telegramId, telegramId));
}

/**
 * Lists Telegram IDs of all subscribed users, optionally excluding one
 * (typically the actor triggering the notification, e.g. group creator).
 *
 * @param excludeId - Telegram ID to omit from the result.
 * @returns Array of subscribed users' Telegram IDs.
 */
export async function listSubscribedUserIds(excludeId?: number): Promise<number[]> {
  const rows = await db
    .select({ telegramId: schema.users.telegramId })
    .from(schema.users)
    .where(
      excludeId !== undefined
        ? and(eq(schema.users.subscribed, true), ne(schema.users.telegramId, excludeId))
        : eq(schema.users.subscribed, true),
    );
  return rows.map((r) => r.telegramId);
}
