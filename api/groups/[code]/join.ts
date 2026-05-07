/**
 * @fileoverview POST /api/groups/[code]/join — add the authenticated user to a group.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../../_db.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Fetches minimal group fields needed for join validation.
 *
 * @param code - Uppercase group code.
 * @returns Row with id, status, current_count, max_members; or null.
 */
async function fetchGroupForJoin(code: string) {
  const { rows } = await sql`
    SELECT id, status, current_count, max_members
    FROM food_groups
    WHERE code = ${code.toUpperCase()}
  `;
  return rows[0] ?? null;
}

/**
 * Validates that a group is joinable by a user who is not already a member.
 *
 * @param group - Group row from the database.
 * @param userId - Telegram ID of the user attempting to join.
 * @throws {ApiError} 404 if group not found; 409 for business rule violations.
 */
async function assertJoinable(
  group: Record<string, unknown> | null,
  userId: number,
): Promise<void> {
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.status === 'cancelled') throw new ApiError(409, 'Group has been cancelled');
  if (group.status === 'expired') throw new ApiError(409, 'Group has expired');
  if (group.status === 'full') throw new ApiError(409, 'Group is already full');

  const { rows } = await sql`
    SELECT 1 FROM group_members
    WHERE group_id = ${group.id as number} AND user_id = ${userId}
  `;
  if (rows.length > 0) throw new ApiError(409, 'Already a member of this group');
}

/**
 * Adds a member to a group and updates `current_count`.
 * Promotes status to 'full' when the count reaches `max_members`.
 *
 * @param groupId - Numeric group ID.
 * @param userId - Telegram ID of the new member.
 * @param newCount - Count after adding this member.
 * @param maxMembers - The group's member cap.
 */
async function addMember(
  groupId: number,
  userId: number,
  newCount: number,
  maxMembers: number,
): Promise<void> {
  await sql`
    INSERT INTO group_members (group_id, user_id) VALUES (${groupId}, ${userId})
  `;
  const newStatus = newCount >= maxMembers ? 'full' : 'open';
  await sql`
    UPDATE food_groups
    SET current_count = ${newCount}, status = ${newStatus}
    WHERE id = ${groupId}
  `;
}

const handler: AuthedHandler = async (req, res, user) => {
  await ensureSchema();
  const code = (req.query.code as string) ?? '';

  const group = await fetchGroupForJoin(code);
  await assertJoinable(group, user.id);

  const newCount = (group!.current_count as number) + 1;
  await addMember(group!.id as number, user.id, newCount, group!.max_members as number);

  ok(res, { message: 'Joined successfully', currentCount: newCount });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
