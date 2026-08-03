/**
 * @fileoverview GET /api/groups/[code] — fetch a single group with its member list.
 *               PATCH /api/groups/[code] — update maxMembers/visibility (creator only).
 */

import type { VercelRequest } from '@vercel/node';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '../../_db.js';
import { foodGroups, groupMembers, users } from '../../_schema.js';
import { parseMaxMembers, parseVisibility } from '../../_validation.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

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

/**
 * Fetches the group and verifies the requesting user is the creator of an active group.
 *
 * @param code - Uppercase group code.
 * @param userId - Telegram ID of the requesting user.
 * @returns The group row if ownership and active status are confirmed.
 * @throws {ApiError} 404 if not found; 403 if not creator; 409 if not open/full.
 */
async function assertUpdatable(code: string, userId: number) {
  const rows = await db
    .select({
      id: foodGroups.id,
      creatorId: foodGroups.creatorId,
      status: foodGroups.status,
      currentCount: foodGroups.currentCount,
    })
    .from(foodGroups)
    .where(eq(foodGroups.code, code));
  const group = rows[0];
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.creatorId !== userId) throw new ApiError(403, 'Only the group creator can update this group');
  if (group.status !== 'open' && group.status !== 'full') {
    throw new ApiError(409, 'Group is no longer open');
  }
  return group;
}

/**
 * Validates the PATCH request body, applying the group's current values as defaults
 * for any field the caller didn't include.
 *
 * @param body - Parsed request body.
 * @param currentCount - The group's current member count, to prevent capping below it.
 * @returns Validated `maxMembers`/`visibility`.
 * @throws {ApiError} 400 if the new maxMembers is below the current member count.
 */
function parseUpdateBody(body: Record<string, unknown>, currentCount: number) {
  const maxMembers = 'maxMembers' in body ? parseMaxMembers(body.maxMembers) : undefined;
  const visibility = 'visibility' in body ? parseVisibility(body.visibility) : undefined;

  if (maxMembers !== null && maxMembers !== undefined && maxMembers < currentCount) {
    throw new ApiError(400, `maxMembers cannot be set below the current member count (${currentCount})`);
  }

  return { maxMembers, visibility };
}

const getHandler: AuthedHandler = async (req, res) => {
  const code = extractCode(req);
  const group = await fetchGroup(code);
  if (!group) throw new ApiError(404, 'Group not found');

  const members = await fetchMembers(group.id);
  ok(res, { ...group, members });
};

const patchHandler: AuthedHandler = async (req, res, user) => {
  const code = extractCode(req);
  const group = await assertUpdatable(code, user.id);
  const { maxMembers, visibility } = parseUpdateBody(req.body as Record<string, unknown>, group.currentCount);

  if (maxMembers === undefined && visibility === undefined) {
    throw new ApiError(400, 'No updatable fields provided');
  }

  await db
    .update(foodGroups)
    .set({
      ...(maxMembers !== undefined ? { maxMembers } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
    })
    .where(eq(foodGroups.id, group.id));

  ok(res, { message: 'Group updated' });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return getHandler(req, res, user);
  if (req.method === 'PATCH') return patchHandler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
