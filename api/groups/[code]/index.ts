/**
 * @fileoverview GET   /api/groups/[code] — group + members.
 *               PATCH /api/groups/[code] — update maxMembers/visibility (creator only).
 *               POST  /api/groups/[code] — { action: 'join' | 'leave' | 'cancel' }.
 */

import { cancelGroup, getGroup, joinGroup, leaveGroup, updateGroup } from '../../_db.js';
import { parseMaxMembers, parseVisibility } from '../../_validation.js';
import { withAuth, ok, ApiError, codeParam, isUniqueViolation } from '../../_response.js';
import { notifyJoin } from '../../_telegram.js';
import { isActive, type GroupDetail } from '../../../shared/rules.js';

async function load(code: string, userId: number): Promise<GroupDetail> {
  const group = await getGroup(code, userId);
  if (!group) throw new ApiError(404, 'Group not found');
  return group;
}

/** Friendly pre-checks; the DB statements in _db.ts are the real guard against races. */
function assertAllowed(action: string, g: GroupDetail, userId: number): void {
  const isCreator = g.creatorId === userId;
  if (!isActive(g.status)) throw new ApiError(409, `Group is ${g.status}`);
  if (action === 'join') {
    if (g.joined) throw new ApiError(409, 'Already a member of this group');
    if (g.status === 'full') throw new ApiError(409, 'Group is already full');
  } else if (action === 'leave') {
    if (isCreator) throw new ApiError(403, 'Leader cannot leave — cancel the group instead');
    if (!g.joined) throw new ApiError(409, 'Not a member of this group');
  } else if (action === 'cancel') {
    if (!isCreator) throw new ApiError(403, 'Only the leader can cancel');
  } else {
    throw new ApiError(400, "action must be 'join', 'leave' or 'cancel'");
  }
}

export default withAuth({
  GET: async (req, res, user) => {
    ok(res, await load(codeParam(req), user.id));
  },

  PATCH: async (req, res, user) => {
    const g = await load(codeParam(req), user.id);
    if (g.creatorId !== user.id) throw new ApiError(403, 'Only the leader can update this group');
    if (!isActive(g.status)) throw new ApiError(409, 'Group is no longer open');

    const body = req.body as Record<string, unknown>;
    const patch = {
      ...('maxMembers' in body ? { maxMembers: parseMaxMembers(body.maxMembers) } : {}),
      ...('visibility' in body ? { visibility: parseVisibility(body.visibility) } : {}),
    };
    if (!Object.keys(patch).length) throw new ApiError(400, 'No updatable fields provided');
    if (patch.maxMembers != null && patch.maxMembers < g.currentCount) {
      throw new ApiError(400, `maxMembers cannot be below the current member count (${g.currentCount})`);
    }

    await updateGroup(g.id, patch);
    ok(res, await load(g.code, user.id));
  },

  POST: async (req, res, user) => {
    const action = String((req.body as Record<string, unknown>)?.action ?? '');
    const g = await load(codeParam(req), user.id);
    assertAllowed(action, g, user.id);

    if (action === 'join') {
      let count: number | null;
      try {
        count = await joinGroup(g.id, user.id);
      } catch (e) {
        if (isUniqueViolation(e)) throw new ApiError(409, 'Already a member of this group');
        throw e;
      }
      if (count === null) throw new ApiError(409, 'Group just filled up or closed');
      const updated = await load(g.code, user.id);
      await notifyJoin(updated, user.id);
      return ok(res, updated);
    }

    if (action === 'leave') {
      if ((await leaveGroup(g.id, user.id)) === null) throw new ApiError(409, 'Not a member of this group');
    } else {
      await cancelGroup(g.id);
    }
    ok(res, await load(g.code, user.id));
  },
});
