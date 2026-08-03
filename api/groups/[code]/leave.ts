/**
 * @fileoverview POST /api/groups/[code]/leave — remove the authenticated user from a group.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../_db.js';
import { foodGroups, groupMembers, type GroupStatus } from '../../_schema.js';
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
  const gRows = await db
    .select({
      id: foodGroups.id,
      creatorId: foodGroups.creatorId,
      currentCount: foodGroups.currentCount,
      status: foodGroups.status,
    })
    .from(foodGroups)
    .where(eq(foodGroups.code, code.toUpperCase()));
  const group = gRows[0];
  if (!group) throw new ApiError(404, 'Group not found');
  if (group.creatorId === userId) throw new ApiError(403, 'Creator cannot leave — cancel the group instead');
  if (group.status === 'cancelled' || group.status === 'expired') {
    throw new ApiError(409, 'Group is no longer active');
  }

  const mRows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
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
  currentStatus: GroupStatus,
): Promise<void> {
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  const newStatus: GroupStatus = currentStatus === 'full' ? 'open' : currentStatus;
  await db.update(foodGroups).set({ currentCount: newCount, status: newStatus }).where(eq(foodGroups.id, groupId));
}

const handler: AuthedHandler = async (req, res, user) => {
  const code = (req.query.code as string) ?? '';

  const group = await assertLeavable(code, user.id);
  const newCount = group.currentCount - 1;
  await removeMember(group.id, user.id, newCount, group.status);

  ok(res, { message: 'Left group successfully', currentCount: newCount });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
