/**
 * @fileoverview Invite link sharing and Telegram DM helpers.
 */

import { shareURL, openTelegramLink } from '@tma.js/sdk-react';
import { inviteLink } from '../../shared/format.ts';

/** Configurable via `VITE_INVITE_LINK_BASE` (see `.env.example`). */
const INVITE_LINK_BASE = import.meta.env.VITE_INVITE_LINK_BASE || 'https://t.me/keat_hong_guard_house_bot/app';

/**
 * Shares a group's invite link via the OS share sheet, then Telegram's share
 * sheet, then a clipboard copy, in that order.
 *
 * @returns `'shared'` if a share sheet was used, `'copied'` if it fell back to clipboard.
 */
export async function shareInvite(code: string, title: string): Promise<'shared' | 'copied'> {
  const link = inviteLink(INVITE_LINK_BASE, code);
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

  await navigator.clipboard.writeText(link);
  return 'copied';
}

/** Opens a Telegram DM inside the client rather than bouncing out to a browser. */
export function openUserChat(username: string): void {
  const link = `https://t.me/${username}`;
  if (openTelegramLink.isAvailable()) openTelegramLink(link);
  else window.open(link, '_blank', 'noopener');
}
