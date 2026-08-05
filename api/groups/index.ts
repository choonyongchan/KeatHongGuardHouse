/**
 * @fileoverview GET /api/groups — list open/full groups.
 *               POST /api/groups — create a new group.
 */

import { sql, eq, and, inArray, getTableColumns } from 'drizzle-orm';
import { db, expireOverdueGroups, listSubscribedUserIds } from '../_db.js';
import { foodGroups, groupMembers, users, type GroupVisibility } from '../_schema.js';
import { generateUniqueCode } from '../_codegen.js';
import { parseMaxMembers, parseVisibility } from '../_validation.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../_response.js';
import { broadcastGroupNotification } from '../_telegram.js';
import type { TelegramUser } from '../_auth.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches all groups with status 'open' or 'full', ordered by expiry time.
 *
 * @returns Array of group rows joined with creator info.
 */
async function listOpenGroups() {
  await expireOverdueGroups();
  return db
    .select({
      ...getTableColumns(foodGroups),
      creatorFirstName: users.firstName,
      creatorUsername: users.username,
    })
    .from(foodGroups)
    .innerJoin(users, eq(users.telegramId, foodGroups.creatorId))
    .where(and(inArray(foodGroups.status, ['open', 'full']), eq(foodGroups.visibility, 'public')))
    .orderBy(foodGroups.expiresAt);
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

  const maxMembers = parseMaxMembers(body.maxMembers);

  const expiryMinutes = Number(body.expiryMinutes);
  if (!Number.isInteger(expiryMinutes) || expiryMinutes < 15 || expiryMinutes > 480) {
    throw new ApiError(400, 'expiryMinutes must be an integer between 15 and 480');
  }

  const visibility = parseVisibility(body.visibility);

  return { title, externalLink, maxMembers, expiryMinutes, visibility };
}

/**
 * Inserts a new food group and adds the creator as the first member.
 * Built as chained writable CTEs (`WITH new_group AS (INSERT...RETURNING),
 * first_member AS (INSERT...SELECT) SELECT * FROM new_group`) so the group
 * insert and membership insert stay atomic in a single statement — the
 * Neon HTTP driver has no interactive BEGIN/COMMIT transactions.
 *
 * @param creatorId - Telegram ID of the group creator.
 * @param title - Group display title.
 * @param externalLink - Optional GrabFood/external URL.
 * @param maxMembers - Maximum number of members allowed.
 * @param expiryMinutes - Minutes from now until the group expires.
 * @param code - Pre-generated unique group code.
 * @param visibility - 'public' (listed in Browse) or 'private' (code/link only).
 * @returns The newly created group row.
 */
async function insertGroup(
  creatorId: number,
  title: string,
  externalLink: string,
  maxMembers: number | null,
  expiryMinutes: number,
  code: string,
  visibility: GroupVisibility,
) {
  const newGroup = db.$with('new_group').as(
    db
      .insert(foodGroups)
      .values({
        code,
        creatorId,
        title,
        externalLink,
        maxMembers,
        expiresAt: sql`NOW() + (${expiryMinutes} || ' minutes')::INTERVAL`,
        visibility,
      })
      .returning(),
  );

  const firstMember = db.$with('first_member').as(
    db.insert(groupMembers).select(
      db.select({ groupId: newGroup.id, userId: newGroup.creatorId, joinedAt: sql`now()` }).from(newGroup),
    ),
  );

  const [group] = await db.with(newGroup, firstMember).select().from(newGroup);
  return group;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

const handleGet: AuthedHandler = async (_req, res) => {
  const groups = await listOpenGroups();
  ok(res, groups);
};

const handlePost: AuthedHandler = async (req, res, user) => {
  const body = parseCreateBody(req.body as Record<string, unknown>);

  const code = await generateUniqueCode(async (c) => {
    const rows = await db.select({ id: foodGroups.id }).from(foodGroups).where(eq(foodGroups.code, c)).limit(1);
    return rows.length > 0;
  });

  const group = await insertGroup(
    user.id,
    body.title,
    body.externalLink,
    body.maxMembers,
    body.expiryMinutes,
    code,
    body.visibility,
  );

  if (body.visibility === 'public') {
    try {
      await notifySubscribers(user, group);
    } catch (e) {
      console.error('[groups] notify failed', e); // never fail the request over this
    }
  }

  ok(res, group);
};

/**
 * Notifies all subscribed users (excluding the creator) that a new public
 * group was posted.
 *
 * @param user - The authenticated Telegram user who created the group.
 * @param group - The newly inserted group row.
 */
async function notifySubscribers(user: TelegramUser, group: typeof foodGroups.$inferSelect): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return; // guaranteed set by withAuth already; defensive only

  const chatIds = await listSubscribedUserIds(user.id);
  if (chatIds.length === 0) return;

  await broadcastGroupNotification(botToken, chatIds, {
    code: group.code,
    title: group.title,
    hostName: user.username ? `@${user.username}` : user.first_name,
    expiresAt: new Date(group.expiresAt),
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') return handleGet(req, res, user);
  if (req.method === 'POST') return handlePost(req, res, user);
  fail(res, 405, 'Method not allowed');
});
