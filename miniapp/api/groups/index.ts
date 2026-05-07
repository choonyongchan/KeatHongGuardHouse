/**
 * @fileoverview GET /api/groups — list open/full groups.
 *               POST /api/groups — create a new group.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../_db.js';
import { generateUniqueCode } from '../_codegen.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../_response.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches all groups with status 'open' or 'full', ordered by expiry time.
 *
 * @returns Array of raw group row objects.
 */
async function listOpenGroups() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      fg.*,
      u.first_name AS creator_first_name,
      u.username   AS creator_username
    FROM food_groups fg
    JOIN users u ON u.telegram_id = fg.creator_id
    WHERE fg.status IN ('open', 'full')
    ORDER BY fg.expires_at ASC
  `;
  return rows;
}

/**
 * Validates the request body for group creation.
 *
 * @param body - Parsed request body.
 * @returns Validated fields.
 * @throws {ApiError} 400 if any field is invalid.
 */
function parseCreateBody(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  if (!title || title.length > 60) throw new ApiError(400, 'Title must be 1–60 characters');

  const externalLink = String(body.externalLink ?? '').trim();
  if (externalLink && !externalLink.startsWith('http')) {
    throw new ApiError(400, 'External link must start with http');
  }

  const maxMembers = Number(body.maxMembers);
  if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 20) {
    throw new ApiError(400, 'maxMembers must be an integer between 2 and 20');
  }

  const expiryMinutes = Number(body.expiryMinutes);
  if (!Number.isInteger(expiryMinutes) || expiryMinutes < 15 || expiryMinutes > 480) {
    throw new ApiError(400, 'expiryMinutes must be an integer between 15 and 480');
  }

  return { title, externalLink, maxMembers, expiryMinutes };
}

/**
 * Inserts a new food group and adds the creator as the first member.
 * Uses a transaction to keep group + membership consistent.
 *
 * @param creatorId - Telegram ID of the group creator.
 * @param title - Group display title.
 * @param externalLink - Optional GrabFood/external URL.
 * @param maxMembers - Maximum number of members allowed.
 * @param expiryMinutes - Minutes from now until the group expires.
 * @param code - Pre-generated unique group code.
 * @returns The newly created group row.
 */
async function insertGroup(
  creatorId: number,
  title: string,
  externalLink: string,
  maxMembers: number,
  expiryMinutes: number,
  code: string,
) {
  const { rows } = await sql`
    WITH new_group AS (
      INSERT INTO food_groups (code, creator_id, title, external_link, max_members, expires_at)
      VALUES (
        ${code},
        ${creatorId},
        ${title},
        ${externalLink},
        ${maxMembers},
        NOW() + (${expiryMinutes} || ' minutes')::INTERVAL
      )
      RETURNING *
    ),
    first_member AS (
      INSERT INTO group_members (group_id, user_id)
      SELECT id, creator_id FROM new_group
    )
    SELECT * FROM new_group
  `;
  return rows[0];
}

// ── Handlers ─────────────────────────────────────────────────────────────────

const handleGet: AuthedHandler = async (_req, res) => {
  const groups = await listOpenGroups();
  ok(res, groups);
};

const handlePost: AuthedHandler = async (req, res, user) => {
  const body = parseCreateBody(req.body as Record<string, unknown>);

  const code = await generateUniqueCode(async (c) => {
    const { rows } = await sql`SELECT 1 FROM food_groups WHERE code = ${c}`;
    return rows.length > 0;
  });

  const group = await insertGroup(
    user.id,
    body.title,
    body.externalLink,
    body.maxMembers,
    body.expiryMinutes,
    code,
  );

  ok(res, group);
};

// ── Entry point ───────────────────────────────────────────────────────────────

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return handleGet(req, res, user);
  if (req.method === 'POST') return handlePost(req, res, user);
  fail(res, 405, 'Method not allowed');
});
