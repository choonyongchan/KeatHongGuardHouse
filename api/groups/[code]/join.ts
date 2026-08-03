/**
 * @fileoverview POST /api/groups/[code]/join — add the authenticated user to a group.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../_db.js';
import { foodGroups, groupMembers, type GroupStatus } from '../../_schema.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Fetches minimal group fields needed for join validation.
 *
 * @param code - Uppercase group code.
 * @returns Row with id, status, current_count, max_members; or null.
 */
async function fetchGroupForJoin(code: string) {
  const rows = await db
    .select({
      id: foodGroups.id,
      status: foodGroups.status,
      currentCount: foodGroups.currentCount,
      maxMembers: foodGroups.maxMembers,
    })
    .from(foodGroups)
    .where(eq(foodGroups.code, code.toUpperCase()));
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
  group: { id: number; status: GroupStatus; currentCount: number; maxMembers: number | null } | null,
  userId: number,
): Promise<void> {
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.status === 'cancelled') throw new ApiError(409, 'Group has been cancelled');
  if (group.status === 'expired') throw new ApiError(409, 'Group has expired');
  if (group.status === 'full') throw new ApiError(409, 'Group is already full');

  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
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
  maxMembers: number | null,
): Promise<void> {
  await db.insert(groupMembers).values({ groupId, userId });
  const newStatus: GroupStatus = maxMembers !== null && newCount >= maxMembers ? 'full' : 'open';
  await db.update(foodGroups).set({ currentCount: newCount, status: newStatus }).where(eq(foodGroups.id, groupId));
}

const handler: AuthedHandler = async (req, res, user) => {
  const code = (req.query.code as string) ?? '';

  const group = await fetchGroupForJoin(code);
  await assertJoinable(group, user.id);

  const newCount = group!.currentCount + 1;
  await addMember(group!.id, user.id, newCount, group!.maxMembers);

  ok(res, { message: 'Joined successfully', currentCount: newCount });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
