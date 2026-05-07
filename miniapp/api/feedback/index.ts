/**
 * @fileoverview POST /api/feedback — submit a user feedback message.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema } from '../_db.js';
import { withAuth, ok, fail, ApiError, type AuthedHandler } from '../_response.js';

/**
 * Parses and validates the feedback message from the request body.
 *
 * @param body - Parsed request body.
 * @returns Trimmed feedback message string.
 * @throws {ApiError} 400 if message is missing or outside the 1–1000 character range.
 */
function parseFeedbackBody(body: Record<string, unknown>): string {
  const message = String(body.message ?? '').trim();
  if (!message || message.length > 1000) {
    throw new ApiError(400, 'Feedback message must be 1–1000 characters');
  }
  return message;
}

/**
 * Persists a feedback message to the database.
 *
 * @param userId - Telegram ID of the submitting user.
 * @param message - The feedback text.
 */
async function insertFeedback(userId: number, message: string): Promise<void> {
  await sql`INSERT INTO feedback (user_id, message) VALUES (${userId}, ${message})`;
}

const handler: AuthedHandler = async (req, res, user) => {
  await ensureSchema();
  const message = parseFeedbackBody(req.body as Record<string, unknown>);
  await insertFeedback(user.id, message);
  ok(res, { message: 'Feedback submitted' });
};

export default withAuth(async (req, res, user) => {
  if (req.method === 'POST') return handler(req, res, user);
  fail(res, 405, 'Method not allowed');
});
