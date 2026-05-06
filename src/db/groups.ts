import { pool, query } from './connection.js'
import type { FoodGroup, GroupMember } from '../types.js'

function rowToFoodGroup(row: Record<string, unknown>): FoodGroup {
  return {
    id:           row['id'] as number,
    code:         row['code'] as string,
    creatorId:    row['creator_id'] as number,
    title:        row['title'] as string,
    externalLink: row['external_link'] as string,
    maxMembers:   row['max_members'] as number,
    currentCount: row['current_count'] as number,
    expiresAt:    row['expires_at'] as Date,
    status:       row['status'] as FoodGroup['status'],
    expiryWarned: row['expiry_warned'] as boolean,
    createdAt:    row['created_at'] as Date,
  }
}

function rowToGroupMember(row: Record<string, unknown>): GroupMember {
  return {
    groupId:   row['group_id'] as number,
    userId:    row['user_id'] as number,
    username:  row['username'] as string | null,
    firstName: row['first_name'] as string,
    joinedAt:  row['joined_at'] as Date,
  }
}

export async function createGroup(params: {
  code: string
  creatorId: number
  title: string
  grabLink: string
  maxMembers: number
  expiresAt: Date
}): Promise<FoodGroup> {
  const res = await query<Record<string, unknown>>(
    `INSERT INTO food_groups (code, creator_id, title, external_link, max_members, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [params.code, params.creatorId, params.title, params.grabLink, params.maxMembers, params.expiresAt]
  )
  return rowToFoodGroup(res.rows[0]!)
}

export async function getGroupByCode(code: string): Promise<FoodGroup | null> {
  const res = await query<Record<string, unknown>>(
    `SELECT fg.id, fg.code, fg.creator_id, fg.title, fg.external_link,
            fg.max_members, fg.expires_at, fg.status, fg.expiry_warned, fg.created_at,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = fg.id) AS current_count
     FROM food_groups fg
     WHERE fg.code = $1`,
    [code]
  )
  return res.rows[0] ? rowToFoodGroup(res.rows[0]) : null
}

export async function getGroupById(id: number): Promise<FoodGroup | null> {
  const res = await query<Record<string, unknown>>(
    `SELECT fg.id, fg.code, fg.creator_id, fg.title, fg.external_link,
            fg.max_members, fg.expires_at, fg.status, fg.expiry_warned, fg.created_at,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = fg.id) AS current_count
     FROM food_groups fg
     WHERE fg.id = $1`,
    [id]
  )
  return res.rows[0] ? rowToFoodGroup(res.rows[0]) : null
}

export async function getOpenGroups(): Promise<FoodGroup[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT fg.id, fg.code, fg.creator_id, fg.title, fg.external_link,
            fg.max_members, fg.expires_at, fg.status, fg.expiry_warned, fg.created_at,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = fg.id) AS current_count
     FROM food_groups fg
     WHERE fg.status IN ('open', 'full')
     ORDER BY fg.expires_at ASC`
  )
  return res.rows.map(rowToFoodGroup)
}

export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT gm.group_id, gm.user_id, gm.joined_at,
            u.username, u.first_name
     FROM group_members gm
     JOIN users u ON gm.user_id = u.telegram_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  )
  return res.rows.map(rowToGroupMember)
}

export async function isMember(groupId: number, userId: number): Promise<boolean> {
  const res = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  return (res.rows[0]?.count ?? '0') !== '0'
}

export async function addMember(groupId: number, userId: number): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, userId]
    )
    await client.query(
      'UPDATE food_groups SET current_count = current_count + 1 WHERE id = $1',
      [groupId]
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function removeMember(groupId: number, userId: number): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    )
    await client.query(
      'UPDATE food_groups SET current_count = current_count - 1 WHERE id = $1',
      [groupId]
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function setStatus(groupId: number, status: FoodGroup['status']): Promise<void> {
  await query(
    'UPDATE food_groups SET status = $1 WHERE id = $2',
    [status, groupId]
  )
}

export async function markExpiryWarned(groupId: number): Promise<void> {
  await query(
    'UPDATE food_groups SET expiry_warned = true WHERE id = $1',
    [groupId]
  )
}

export async function getGroupsToExpire(): Promise<FoodGroup[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT * FROM food_groups WHERE status IN ('open', 'full') AND expires_at <= NOW()`
  )
  return res.rows.map(rowToFoodGroup)
}

export async function getGroupsToWarn(): Promise<FoodGroup[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT * FROM food_groups
     WHERE status = 'open'
       AND expiry_warned = false
       AND expires_at <= NOW() + INTERVAL '15 minutes'
       AND expires_at > NOW()`
  )
  return res.rows.map(rowToFoodGroup)
}
