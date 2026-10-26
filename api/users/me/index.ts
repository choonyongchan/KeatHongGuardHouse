/**
 * @fileoverview GET   /api/users/me — profile + notification categories.
 *               PATCH /api/users/me — { subscriptions: Category[] }.
 */

import { getSubscriptions, setSubscriptions } from '../../_db.js';
import { parseCategories } from '../../_validation.js';
import { withAuth, ok } from '../../_response.js';
import type { TelegramUser } from '../../_auth.js';
import type { UserProfile } from '../../../shared/rules.js';

async function profile(user: TelegramUser): Promise<UserProfile> {
  return {
    id: user.id,
    firstName: user.first_name,
    username: user.username ?? null,
    subscriptions: await getSubscriptions(user.id),
  };
}

export default withAuth({
  GET: async (_req, res, user) => ok(res, await profile(user)),

  PATCH: async (req, res, user) => {
    await setSubscriptions(user.id, parseCategories((req.body as Record<string, unknown>).subscriptions));
    ok(res, await profile(user));
  },
});
