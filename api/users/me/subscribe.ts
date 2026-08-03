/**
 * @fileoverview POST /api/users/me/subscribe — toggle the notification subscription flag.
 */

import { setSubscribed } from '../../_db.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Parses and validates the `subscribed` boolean from the request body.
 *
 * @param body - Parsed request body.
 * @returns The desired subscription state.
 * @throws {ApiError} 400 if `subscribed` is not a boolean.
 */
function parseSubscribeBody(body: Record<string, unknown>): boolean {
  if (typeof body.subscribed !== 'boolean') {
    throw new ApiError(400, '`subscribed` must be a boolean');
  }
  return body.subscribed;
}

const handler: AuthedHandler = async (req, res, user) => {
  const subscribed = parseSubscribeBody(req.body as Record<string, unknown>);
  await setSubscribed(user.id, subscribed);
  ok(res, { subscribed });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
