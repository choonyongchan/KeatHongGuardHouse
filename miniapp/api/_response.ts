/**
 * @fileoverview Shared HTTP response helpers and middleware for Vercel Functions.
 * Provides a consistent JSON envelope and a `withAuth` wrapper that handles
 * initData validation and top-level error handling for every route.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateInitData, type TelegramUser } from './_auth.js';
import { upsertUser } from './_db.js';

/** Handler that receives an authenticated Telegram user alongside the request. */
export type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  user: TelegramUser,
) => Promise<void>;

/**
 * Represents a handled API error with an associated HTTP status code.
 * Throw this inside route handlers to produce structured error responses.
 */
export class ApiError extends Error {
  /**
   * @param status - HTTP status code (e.g. 400, 403, 404).
   * @param message - Human-readable error description.
   */
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sends a 200 JSON success response.
 *
 * @param res - Vercel response object.
 * @param data - Payload to serialize as JSON.
 */
export function ok(res: VercelResponse, data: unknown): void {
  res.status(200).json(data);
}

/**
 * Sends a JSON error response using the given status code.
 *
 * @param res - Vercel response object.
 * @param status - HTTP status code.
 * @param message - Error message string.
 */
export function fail(res: VercelResponse, status: number, message: string): void {
  res.status(status).json({ error: message });
}

/**
 * Wraps a route handler with Telegram initData authentication and error handling.
 *
 * Steps performed before calling the inner handler:
 *  1. Reads the `x-init-data` request header.
 *  2. Validates the initData signature with `BOT_TOKEN`.
 *  3. Upserts the extracted Telegram user into the database.
 *  4. Invokes the inner handler with `(req, res, user)`.
 *
 * Any thrown `ApiError` is forwarded as a structured error response.
 * Unexpected errors produce a 500 response without leaking internals.
 *
 * @param handler - The authenticated route handler to wrap.
 * @returns A standard Vercel serverless function handler.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      const rawInitData = req.headers['x-init-data'];
      if (!rawInitData || typeof rawInitData !== 'string') {
        throw new ApiError(401, 'Missing x-init-data header');
      }

      const botToken = process.env.BOT_TOKEN;
      if (!botToken) throw new ApiError(500, 'Server misconfiguration');

      const tgUser = await validateInitData(rawInitData, botToken);
      await upsertUser(tgUser.id, tgUser.username ?? null, tgUser.first_name);

      await handler(req, res, tgUser);
    } catch (e) {
      if (e instanceof ApiError) {
        fail(res, e.status, e.message);
      } else {
        console.error(e);
        fail(res, 500, 'Internal server error');
      }
    }
  };
}
