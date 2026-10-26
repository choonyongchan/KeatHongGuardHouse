/**
 * @fileoverview API client for the KeatHong MiniApp Vercel Functions.
 * Injects the Telegram initData as the `x-init-data` header on every request.
 */

import { initData } from '@tma.js/sdk-react';
import type { Category, Group, GroupDetail, GroupVisibility, UserProfile } from '../../shared/rules.ts';

/**
 * Authenticated fetch to a same-origin API route.
 *
 * @throws {Error} With the server's error message if the response is not OK.
 */
async function apiFetch<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const raw = initData.raw();
  if (!raw) throw new Error('Telegram initData not available');

  const res = await fetch(path, {
    method,
    headers: { 'x-init-data': raw, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: T & { error?: string };
  try {
    json = await res.json() as T & { error?: string };
  } catch {
    throw new Error(`HTTP ${res.status}: unexpected response from server`);
  }
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export const getGroups = (mine: boolean) => apiFetch<Group[]>(mine ? '/api/groups?mine=1' : '/api/groups');

export const getGroup = (code: string) => apiFetch<GroupDetail>(`/api/groups/${code}`);

export const createGroup = (payload: {
  title: string;
  category: Category;
  externalLink: string;
  maxMembers: number | null;
  expiryMinutes: number;
}) => apiFetch<GroupDetail>('/api/groups', 'POST', payload);

export type GroupAction = 'join' | 'leave' | 'cancel';

export const groupAction = (code: string, action: GroupAction) =>
  apiFetch<GroupDetail>(`/api/groups/${code}`, 'POST', { action });

export const updateGroup = (code: string, patch: { maxMembers?: number | null; visibility?: GroupVisibility }) =>
  apiFetch<GroupDetail>(`/api/groups/${code}`, 'PATCH', patch);

export const getMe = () => apiFetch<UserProfile>('/api/users/me');

export const setSubscriptions = (subscriptions: Category[]) =>
  apiFetch<UserProfile>('/api/users/me', 'PATCH', { subscriptions });
