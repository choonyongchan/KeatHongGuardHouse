/**
 * @fileoverview API client for the KeatHong MiniApp Vercel Functions.
 * Injects the Telegram initData as the `x-init-data` header on every request.
 */

import { initData } from '@tma.js/sdk-react';
import type { FoodGroup, FoodGroupDetail, UserProfile } from '../types.ts';

/** Base path — empty string so requests go to the same Vercel origin. */
const BASE = '';

/**
 * Retrieves the raw Telegram initData string for use as an auth header.
 *
 * @returns Raw initData string from the Telegram WebApp SDK.
 * @throws {Error} If initData is not available (app launched outside Telegram).
 */
function getInitData(): string {
  const raw = initData.raw();
  if (!raw) throw new Error('Telegram initData not available');
  return raw;
}

/**
 * Performs an authenticated fetch to a Vercel API route.
 * Attaches `x-init-data` and sets Content-Type for POST requests.
 *
 * @param path - API path (e.g. `/api/groups`).
 * @param options - Standard `RequestInit` options (method, body, etc.).
 * @returns Parsed JSON response body.
 * @throws {Error} If the HTTP response is not OK, with the server's error message.
 */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'x-init-data': getInitData(),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  if (!text) throw new Error(`HTTP ${res.status}: empty response from server`);

  let json: T & { error?: string };
  try {
    json = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(`HTTP ${res.status}: unexpected response from server`);
  }

  if (!res.ok) throw new Error((json as { error: string }).error ?? `HTTP ${res.status}`);
  return json;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches all open and full groups.
 *
 * @returns Array of food groups.
 */
export function getGroups(): Promise<FoodGroup[]> {
  return apiFetch<FoodGroup[]>('/api/groups');
}

/**
 * Fetches a single group with its member list.
 *
 * @param code - Uppercase group code.
 * @returns Group detail including members array.
 */
export function getGroup(code: string): Promise<FoodGroupDetail> {
  return apiFetch<FoodGroupDetail>(`/api/groups/${code}`);
}

/**
 * Creates a new food group.
 *
 * @param payload - Group creation fields.
 * @returns The newly created group row.
 */
export function createGroup(payload: {
  title: string;
  externalLink: string;
  maxMembers: number | null;
  expiryMinutes: number;
}): Promise<FoodGroup> {
  return apiFetch<FoodGroup>('/api/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Joins a group by code.
 *
 * @param code - Uppercase group code.
 * @returns Updated current count.
 */
export function joinGroup(code: string): Promise<{ message: string; currentCount: number }> {
  return apiFetch(`/api/groups/${code}/join`, { method: 'POST' });
}

/**
 * Leaves a group by code.
 *
 * @param code - Uppercase group code.
 * @returns Updated current count.
 */
export function leaveGroup(code: string): Promise<{ message: string; currentCount: number }> {
  return apiFetch(`/api/groups/${code}/leave`, { method: 'POST' });
}

/**
 * Cancels a group by code (creator only).
 *
 * @param code - Uppercase group code.
 * @returns Confirmation message.
 */
export function cancelGroup(code: string): Promise<{ message: string }> {
  return apiFetch(`/api/groups/${code}/cancel`, { method: 'POST' });
}

/**
 * Fetches the current user's profile, created groups, and joined groups.
 *
 * @returns User profile with group lists.
 */
export function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/users/me');
}

/**
 * Updates the current user's notification subscription preference.
 *
 * @param subscribed - Desired subscription state.
 * @returns The updated subscription state.
 */
export function setSubscription(subscribed: boolean): Promise<{ subscribed: boolean }> {
  return apiFetch('/api/users/me/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscribed }),
  });
}

/**
 * Submits a feedback message.
 *
 * @param message - Feedback text (1–1000 characters).
 * @returns Confirmation message.
 */
export function submitFeedback(message: string): Promise<{ message: string }> {
  return apiFetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
