/**
 * @fileoverview POST /api/groups/[code]/leave — remove the authenticated user from a group.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../../_db.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Validates that the user is a non-creator member of the group.
 *
 * @param code - Uppercase group code.
 * @param userId - Telegram ID of the user requesting to leave.
 * @returns The group row if all checks pass.
 * @throws {ApiError} 404 if group not found; 403/409 for rule violations.
 */
async function assertLeavable(code: string, userId: number) {
  const { rows: gRows } = await sql`
    SELECT id, creator_id, current_count, status
    FROM food_groups WHERE code = ${code.toUpperCase()}
  `;
  const group = gRows[0];
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.creator_id === userId) throw new ApiError(403, 'Creator cannot leave — cancel the group instead');
  if (group.status === 'cancelled' || group.status === 'expired') {
    throw new ApiError(409, 'Group is no longer active');
  }

  const { rows: mRows } = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${group.id as number} AND user_id = ${userId}
  `;
  if (mRows.length === 0) throw new ApiError(409, 'Not a member of this group');

  return group;
}

/**
 * Removes a member from a group and decrements `current_count`.
 * Re-opens the group status if it was 'full'.
 *
 * @param groupId - Numeric group ID.
 * @param userId - Telegram ID of the member leaving.
 * @param newCount - Member count after removal.
 * @param currentStatus - Current group status.
 */
async function removeMember(
  groupId: number,
  userId: number,
  newCount: number,
  currentStatus: string,
): Promise<void> {
  await sql`
    DELETE FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}
  `;
  const newStatus = currentStatus === 'full' ? 'open' : currentStatus;
  await sql`
    UPDATE food_groups SET current_count = ${newCount}, status = ${newStatus} WHERE id = ${groupId}
  `;
}

const handler: AuthedHandler = async (req, res, user) => {
  await ensureSchema();
  const code = (req.query.code as string) ?? '';

  const group = await assertLeavable(code, user.id);
  const newCount = (group.current_count as number) - 1;
  await removeMember(group.id as number, user.id, newCount, group.status as string);

  ok(res, { message: 'Left group successfully', currentCount: newCount });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
