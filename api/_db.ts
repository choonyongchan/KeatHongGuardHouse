/**
 * @fileoverview Vercel Postgres connection and shared database helpers.
 * Reads POSTGRES_URL from the environment (auto-wired by Vercel).
 * Schema is initialized lazily on the first call to `ensureSchema()`.
 */

import { sql } from '@vercel/postgres';

let schemaReady = false;

/**
 * Creates all application tables if they do not yet exist.
 * Idempotent — safe to call on every cold start.
 *
 * @returns Resolves when the schema is confirmed present.
 * @throws {Error} If any DDL statement fails.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id   BIGINT PRIMARY KEY,
      username      TEXT,
      first_name    TEXT NOT NULL,
      subscribed    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS food_groups (
      id              SERIAL PRIMARY KEY,
      code            TEXT NOT NULL UNIQUE,
      creator_id      BIGINT NOT NULL REFERENCES users(telegram_id),
      title           TEXT NOT NULL,
      external_link   TEXT NOT NULL DEFAULT '',
      max_members     INT NOT NULL,
      current_count   INT NOT NULL DEFAULT 1,
      expires_at      TIMESTAMPTZ NOT NULL,
      status          TEXT NOT NULL DEFAULT 'open',
      expiry_warned   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT status_values CHECK (status IN ('open','full','expired','cancelled'))
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id    INT NOT NULL REFERENCES food_groups(id) ON DELETE CASCADE,
      user_id     BIGINT NOT NULL REFERENCES users(telegram_id),
      joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id          SERIAL PRIMARY KEY,
      user_id     BIGINT NOT NULL REFERENCES users(telegram_id),
      message     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaReady = true;
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
  await ensureSchema();
  await sql`
    INSERT INTO users (telegram_id, username, first_name)
    VALUES (${telegramId}, ${username}, ${firstName})
    ON CONFLICT (telegram_id) DO UPDATE
      SET username   = EXCLUDED.username,
          first_name = EXCLUDED.first_name
  `;
}

/**
 * Retrieves the `subscribed` flag for a user.
 *
 * @param telegramId - The user's numeric Telegram ID.
 * @returns True if the user is subscribed, false otherwise.
 */
export async function getSubscribed(telegramId: number): Promise<boolean> {
  const { rows } = await sql`
    SELECT subscribed FROM users WHERE telegram_id = ${telegramId}
  `;
  return (rows[0]?.subscribed as boolean) ?? false;
}

/**
 * Updates the `subscribed` flag for a user.
 *
 * @param telegramId - The user's numeric Telegram ID.
 * @param subscribed - The desired subscription state.
 */
export async function setSubscribed(telegramId: number, subscribed: boolean): Promise<void> {
  await sql`
    UPDATE users SET subscribed = ${subscribed} WHERE telegram_id = ${telegramId}
  `;
}

/** Re-export `sql` for use in route files that need custom queries. */
export { sql };
