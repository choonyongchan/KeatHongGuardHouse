/**
 * @fileoverview GET /api/users/me — current user profile, groups created, and groups joined.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, getSubscribed } from '../../_db.js';
import { withAuth, ok, fail, type AuthedHandler } from '../../_response.js';

/**
 * Fetches all active groups created by a user.
 *
 * @param userId - Telegram ID of the creator.
 * @returns Array of group rows ordered by creation time descending.
 */
async function fetchCreatedGroups(userId: number) {
  const { rows } = await sql`
    SELECT * FROM food_groups
    WHERE creator_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows;
}

/**
 * Fetches all groups the user has joined (excluding groups they created).
 *
 * @param userId - Telegram ID of the member.
 * @returns Array of group rows ordered by join time descending.
 */
async function fetchJoinedGroups(userId: number) {
  const { rows } = await sql`
    SELECT fg.* FROM food_groups fg
    JOIN group_members gm ON gm.group_id = fg.id
    WHERE gm.user_id = ${userId} AND fg.creator_id != ${userId}
    ORDER BY gm.joined_at DESC
  `;
  return rows;
}

const handler: AuthedHandler = async (_req, res, user) => {
  await ensureSchema();
  const [subscribed, created, joined] = await Promise.all([
    getSubscribed(user.id),
    fetchCreatedGroups(user.id),
    fetchJoinedGroups(user.id),
  ]);

  ok(res, {
    id: user.id,
    firstName: user.first_name,
    username: user.username ?? null,
    subscribed,
    createdGroups: created,
    joinedGroups: joined,
  });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
