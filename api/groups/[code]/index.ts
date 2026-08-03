/**
 * @fileoverview GET /api/groups/[code] — fetch a single group with its member list.
 */

import type { VercelRequest } from '@vercel/node';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '../../_db.js';
import { foodGroups, groupMembers, users } from '../../_schema.js';
import { withAuth, ok, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Extracts the `code` path parameter from a Vercel dynamic route request.
 *
 * @param req - Vercel request with query params populated by file-based routing.
 * @returns Uppercase group code string.
 * @throws {ApiError} 400 if the code param is missing or not a string.
 */
function extractCode(req: VercelRequest): string {
  const { code } = req.query;
  if (!code || typeof code !== 'string') throw new ApiError(400, 'Missing group code');
  return code.toUpperCase();
}

/**
 * Fetches a food group row by its code.
 *
 * @param code - Uppercase group code.
 * @returns The group row, or null if not found.
 */
async function fetchGroup(code: string) {
  const rows = await db
    .select({
      ...getTableColumns(foodGroups),
      creatorFirstName: users.firstName,
      creatorUsername: users.username,
    })
    .from(foodGroups)
    .innerJoin(users, eq(users.telegramId, foodGroups.creatorId))
    .where(eq(foodGroups.code, code));
  return rows[0] ?? null;
}

/**
 * Fetches all members of a group ordered by join time.
 *
 * @param groupId - Numeric group ID.
 * @returns Array of member rows with user details.
 */
async function fetchMembers(groupId: number) {
  return db
    .select({
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      joinedAt: groupMembers.joinedAt,
      firstName: users.firstName,
      username: users.username,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.telegramId, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);
}

const handler: AuthedHandler = async (req, res) => {
  const code = extractCode(req);
  const group = await fetchGroup(code);
  if (!group) throw new ApiError(404, 'Group not found');

  const members = await fetchMembers(group.id);
  ok(res, { ...group, members });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return handler(req, res, user);

  const { fail } = await import('../../_response.js');
  fail(res, 405, 'Method not allowed');
});
