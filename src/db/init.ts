/**
 * @fileoverview Database initialization module for creating and managing PostgreSQL tables.
 * This module initializes the schema for the food groups application including users,
 * food groups, group memberships, and feedback tables.
 */

import { pool } from './connection.js'

/**
 * Initializes the PostgreSQL database schema.
 *
 * Creates four main tables:
 * - users: Stores Telegram user information
 * - food_groups: Manages food group listings with metadata
 * - group_members: Tracks user membership in groups
 * - feedback: Stores user feedback messages
 *
 * All operations are performed within a transaction. If any table creation fails,
 * all changes are rolled back to maintain database consistency.
 *
 * @returns {Promise<void>} Resolves when all tables have been successfully created.
 *
 * @throws {Error} Throws an error if any SQL query fails. The transaction is rolled back
 *   before the error is rethrown to ensure database integrity.
 *
 * @example
 * ```typescript
 * import { initDb } from './db/init.js';
 *
 * try {
 *   await initDb();
 *   console.log('Database initialized successfully');
 * } catch (error) {
 *   console.error('Failed to initialize database:', error);
 * }
 * ```
 */
export async function initDb(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id   BIGINT PRIMARY KEY,
        username      TEXT,
        first_name    TEXT NOT NULL,
        subscribed    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS food_groups (
        id              SERIAL PRIMARY KEY,
        code            TEXT NOT NULL UNIQUE,
        creator_id      BIGINT NOT NULL REFERENCES users(telegram_id),
        title           TEXT NOT NULL,
        external_link   TEXT NOT NULL,
        max_members     INT NOT NULL,
        current_count   INT NOT NULL DEFAULT 1,
        expires_at      TIMESTAMPTZ NOT NULL,
        status          TEXT NOT NULL DEFAULT 'open',
        expiry_warned   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT status_values CHECK (status IN ('open','full','expired','cancelled'))
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id    INT NOT NULL REFERENCES food_groups(id) ON DELETE CASCADE,
        user_id     BIGINT NOT NULL REFERENCES users(telegram_id),
        joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, user_id)
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id          SERIAL PRIMARY KEY,
        user_id     BIGINT NOT NULL REFERENCES users(telegram_id),
        message     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
