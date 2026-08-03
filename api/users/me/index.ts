/**
 * @fileoverview GET /api/users/me — current user profile, groups created, and groups joined.
 */

import { eq, and, ne, or, gt, getTableColumns } from 'drizzle-orm';
import { db, expireOverdueGroups, getSubscribed } from '../../_db.js';
import { foodGroups, groupMembers } from '../../_schema.js';
import { withAuth, ok, fail, type AuthedHandler } from '../../_response.js';

/**
 * Fetches all active groups created by a user.
 *
 * @param userId - Telegram ID of the creator.
 * @returns Array of group rows ordered by creation time descending.
 */
async function fetchCreatedGroups(userId: number) {
  return db
    .select()
    .from(foodGroups)
    .where(
      and(
        eq(foodGroups.creatorId, userId),
        ne(foodGroups.status, 'cancelled'),
        or(ne(foodGroups.status, 'expired'), gt(foodGroups.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
      ),
    )
    .orderBy(foodGroups.createdAt);
}

/**
 * Fetches all groups the user has joined (excluding groups they created).
 *
 * @param userId - Telegram ID of the member.
 * @returns Array of group rows ordered by join time descending.
 */
async function fetchJoinedGroups(userId: number) {
  return db
    .select(getTableColumns(foodGroups))
    .from(foodGroups)
    .innerJoin(groupMembers, eq(groupMembers.groupId, foodGroups.id))
    .where(
      and(
        eq(groupMembers.userId, userId),
        ne(foodGroups.creatorId, userId),
        ne(foodGroups.status, 'cancelled'),
        or(ne(foodGroups.status, 'expired'), gt(foodGroups.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
      ),
    )
    .orderBy(groupMembers.joinedAt);
}

const handler: AuthedHandler = async (_req, res, user) => {
  await expireOverdueGroups();
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
