/**
 * @fileoverview GET /api/groups — public active groups (`?mine=1`: the caller's groups).
 *               POST /api/groups — create a group; DMs subscribers of its category.
 */

import { getGroup, insertGroup, isCodeTaken, listMyGroups, listPublicGroups, listSubscriberIds } from '../_db.js';
import { generateUniqueCode } from '../_codegen.js';
import { parseCreateBody } from '../_validation.js';
import { withAuth, ok } from '../_response.js';
import { notifyNewGroup } from '../_telegram.js';

export default withAuth({
  GET: async (req, res, user) => {
    ok(res, req.query.mine ? await listMyGroups(user.id) : await listPublicGroups(user.id));
  },

  POST: async (req, res, user) => {
    const body = parseCreateBody(req.body as Record<string, unknown>);
    const code = await generateUniqueCode(isCodeTaken);
    await insertGroup({ ...body, code, creatorId: user.id });
    const group = (await getGroup(code, user.id))!;

    if (group.visibility === 'public') {
      // ponytail: awaited so the function isn't frozen mid-send; move to waitUntil if create feels slow.
      await notifyNewGroup(await listSubscriberIds(group.category, user.id), group);
    }
    ok(res, group);
  },
});
