/**
 * @fileoverview POST /api/groups/[code]/cancel — cancel a group (creator only).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../../_db.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Fetches the group and verifies the requesting user is the creator.
 *
 * @param code - Uppercase group code.
 * @param userId - Telegram ID of the requesting user.
 * @returns The group row if ownership is confirmed.
 * @throws {ApiError} 404 if not found; 403 if not creator; 409 if already inactive.
 */
async function assertCancellable(code: string, userId: number) {
  const { rows } = await sql`
    SELECT id, creator_id, status FROM food_groups WHERE code = ${code.toUpperCase()}
  `;
  const group = rows[0];
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.creator_id !== userId) throw new ApiError(403, 'Only the group creator can cancel');
  if (group.status === 'cancelled') throw new ApiError(409, 'Group is already cancelled');
  if (group.status === 'expired') throw new ApiError(409, 'Group has already expired');
  return group;
}

/**
 * Sets a group's status to 'cancelled'.
 *
 * @param groupId - Numeric group ID.
 */
async function markCancelled(groupId: number): Promise<void> {
  await sql`UPDATE food_groups SET status = 'cancelled' WHERE id = ${groupId}`;
}

const handler: AuthedHandler = async (req, res, user) => {
  await ensureSchema();
  const code = (req.query.code as string) ?? '';

  const group = await assertCancellable(code, user.id);
  await markCancelled(group.id as number);

  ok(res, { message: 'Group cancelled' });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
