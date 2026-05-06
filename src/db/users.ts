import { query } from './connection.js'
import type { User } from '../types.js'

function rowToUser(row: Record<string, unknown>): User {
  return {
    telegramId: row['telegram_id'] as number,
    username:   row['username'] as string | null,
    firstName:  row['first_name'] as string,
    subscribed: row['subscribed'] as boolean,
    createdAt:  row['created_at'] as Date,
  }
}

export async function upsertUser(
  telegramId: number,
  username: string | null,
  firstName: string
): Promise<User> {
  const res = await query<Record<string, unknown>>(
    `INSERT INTO users (telegram_id, username, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE
       SET username = EXCLUDED.username,
           first_name = EXCLUDED.first_name
     RETURNING *`,
    [telegramId, username, firstName]
  )
  return rowToUser(res.rows[0]!)
}

export async function getUser(telegramId: number): Promise<User | null> {
  const res = await query<Record<string, unknown>>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  )
  return res.rows[0] ? rowToUser(res.rows[0]) : null
}

export async function setSubscribed(telegramId: number, value: boolean): Promise<void> {
  await query(
    'UPDATE users SET subscribed = $1 WHERE telegram_id = $2',
    [value, telegramId]
  )
}

export async function getSubscriberIds(): Promise<number[]> {
  const res = await query<{ telegram_id: number }>(
    'SELECT telegram_id FROM users WHERE subscribed = true'
  )
  return res.rows.map(r => r.telegram_id)
}
