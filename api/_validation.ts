/**
 * @fileoverview Shared request-body field validators used by multiple group routes.
 */

import { ApiError } from './_response.js';
import type { GroupVisibility } from './_schema.js';

/**
 * Validates a `maxMembers` field: null (no limit) or an integer between 2 and 50.
 *
 * @param value - Raw input value.
 * @returns Validated `maxMembers`.
 * @throws {ApiError} 400 if invalid.
 */
export function parseMaxMembers(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2 || n > 50) {
    throw new ApiError(400, 'maxMembers must be an integer between 2 and 50, or null for no limit');
  }
  return n;
}

/**
 * Validates a `visibility` field, defaulting to 'public' when absent.
 *
 * @param value - Raw input value.
 * @returns Validated `visibility`.
 * @throws {ApiError} 400 if invalid.
 */
export function parseVisibility(value: unknown): GroupVisibility {
  const input = value === undefined ? 'public' : String(value);
  if (input !== 'public' && input !== 'private') {
    throw new ApiError(400, "visibility must be 'public' or 'private'");
  }
  return input;
}
