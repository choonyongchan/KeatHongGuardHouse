/**
 * @fileoverview GET /api/groups/[code] — fetch a single group with its member list.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../../_db.js';
import { withAuth, ok, ApiError, type AuthedHandler } from '../../_response.js';

/**
 * Extracts the `code` path parameter from a Vercel dynamic route request.
 *
 * @param req - Vercel request with query params populated by file-based routing.
 * @returns Uppercase group code string.
 * @throws {ApiError} 400 if the code param is missing or not a string.
 */
function extractCode(req: VercelRequest): string {
  const { code } = req.query;
  if (!code || typeof code !== 'string') throw new ApiError(400, 'Missing group code');
  return code.toUpperCase();
}

/**
 * Fetches a food group row by its code.
 *
 * @param code - Uppercase group code.
 * @returns The group row, or null if not found.
 */
async function fetchGroup(code: string) {
  const { rows } = await sql`
    SELECT
      fg.*,
      u.first_name AS creator_first_name,
      u.username   AS creator_username
    FROM food_groups fg
    JOIN users u ON u.telegram_id = fg.creator_id
    WHERE fg.code = ${code}
  `;
  return rows[0] ?? null;
}

/**
 * Fetches all members of a group ordered by join time.
 *
 * @param groupId - Numeric group ID.
 * @returns Array of member rows with user details.
 */
async function fetchMembers(groupId: number) {
  const { rows } = await sql`
    SELECT
      gm.group_id,
      gm.user_id,
      gm.joined_at,
      u.first_name,
      u.username
    FROM group_members gm
    JOIN users u ON u.telegram_id = gm.user_id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.joined_at ASC
  `;
  return rows;
}

const handler: AuthedHandler = async (req, res) => {
  await ensureSchema();
  const code = extractCode(req);
  const group = await fetchGroup(code);
  if (!group) throw new ApiError(404, 'Group not found');

  const members = await fetchMembers(group.id as number);
  ok(res, { ...group, members });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return handler(req, res, user);

  const { fail } = await import('../../_response.js');
  fail(res, 405, 'Method not allowed');
});
