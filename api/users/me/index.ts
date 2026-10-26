/**
 * @fileoverview GET   /api/users/me — profile + notification categories.
 *               PATCH /api/users/me — { notify?: boolean, subscriptions?: Category[] }.
 */

import { getNotifySettings, setNotify, setSubscriptions } from '../../_db.js';
import { parseCategories } from '../../_validation.js';
import { ApiError, withAuth, ok } from '../../_response.js';
import type { TelegramUser } from '../../_auth.js';
import type { UserProfile } from '../../../shared/rules.js';

async function profile(user: TelegramUser): Promise<UserProfile> {
  return {
    id: user.id,
    firstName: user.first_name,
    username: user.username ?? null,
    ...(await getNotifySettings(user.id)),
  };
}

export default withAuth({
  GET: async (_req, res, user) => ok(res, await profile(user)),

  PATCH: async (req, res, user) => {
    const body = req.body as Record<string, unknown>;
    if (body.notify !== undefined) {
      if (typeof body.notify !== 'boolean') throw new ApiError(400, 'notify must be a boolean');
      await setNotify(user.id, body.notify);
    }
    if (body.subscriptions !== undefined) await setSubscriptions(user.id, parseCategories(body.subscriptions));
    ok(res, await profile(user));
  },
});
