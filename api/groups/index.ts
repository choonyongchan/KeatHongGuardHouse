/**
 * @fileoverview GET /api/groups — public active groups (`?mine=1`: the caller's groups).
 *               POST /api/groups — create a group; DMs subscribers of its category.
 */

import { getGroup, insertGroup, isCodeTaken, listMyGroups, listPublicGroups, listSubscriberIds } from '../_db.js';
import { generateUniqueCode } from '../_codegen.js';
import { parseCreateBody } from '../_validation.js';
import { withAuth, ok } from '../_response.js';
import { waitUntil } from '@vercel/functions';
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
      // Background: respond now, keep the function alive until every DM is sent.
      waitUntil(listSubscriberIds(group.category, user.id)
        .then((ids) => notifyNewGroup(ids, group))
        .catch((e) => console.warn('[telegram] new-group DMs failed', e)));
    }
    ok(res, group);
  },
});
