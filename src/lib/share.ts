/**
 * @fileoverview Invite link building and share/copy helpers for group codes.
 */

import { shareURL } from '@tma.js/sdk-react';

/**
 * Base t.me deep link for the KeatHong GuardHouse Mini App. Configurable via
 * `VITE_INVITE_LINK_BASE` so it can be changed (new bot/app name) without a
 * code change — see `.env.example`.
 */
export const INVITE_LINK_BASE =
  import.meta.env.VITE_INVITE_LINK_BASE || 'https://t.me/keat_hong_guard_house_bot/app';

/**
 * Builds a shareable deep link that opens the Mini App directly into a group.
 *
 * @param code - Uppercase group invite code.
 * @returns Full `t.me` URL with `startapp` set to the code.
 */
export function buildInviteLink(code: string): string {
  return `${INVITE_LINK_BASE}?startapp=${code}`;
}

/**
 * Copies plain text to the clipboard.
 *
 * @param text - Text to copy.
 */
function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/**
 * Copies a raw invite code to the clipboard.
 *
 * @param code - Uppercase group invite code.
 */
export function copyInviteCode(code: string): Promise<void> {
  return copyText(code);
}

/**
 * Shares a group's invite link via the phone's native OS share sheet
 * (Web Share API) when available, so it can be sent through any app —
 * not just Telegram. Falls back to Telegram's own share sheet, then to
 * a clipboard copy, in that order.
 *
 * @param code - Uppercase group invite code.
 * @param title - Group title, used as share text.
 * @returns `'shared'` if a share sheet was used, `'copied'` if it fell back to clipboard.
 */
export async function shareInvite(code: string, title: string): Promise<'shared' | 'copied'> {
  const link = buildInviteLink(code);
  const text = `Join "${title}" on KeatHong GuardHouse`;

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: text, url: link });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'shared';
    }
  }

  if (shareURL.isAvailable()) {
    shareURL(link, text);
    return 'shared';
  }

  await copyText(link);
  return 'copied';
}
