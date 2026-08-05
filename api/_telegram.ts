/**
 * @fileoverview Outbound Telegram Bot API calls (sendMessage) for group
 * broadcast notifications. Uses raw fetch — no bot framework dependency.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const SGT = 'Asia/Singapore';

// Server-side equivalent of src/lib/share.ts buildInviteLink — frontend
// `src/` code isn't importable from `api/` Vercel functions (separate build
// target), so this small helper is intentionally duplicated here.
const INVITE_LINK_BASE =
  process.env.VITE_INVITE_LINK_BASE || 'https://t.me/keat_hong_guard_house_bot/app';

function buildInviteLink(code: string): string {
  return `${INVITE_LINK_BASE}?startapp=${code}`;
}

// Minimal server-side equivalent of src/lib/formatters.ts formatExpiry.
function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SGT,
  }).format(expiresAt);
}

export interface GroupNotification {
  code: string;
  title: string;
  hostName: string;
  expiresAt: Date;
}

/**
 * Sends a single Telegram DM via sendMessage with an inline "View Group"
 * button. Never throws — returns a result object so the caller can batch
 * failures without one bad chat_id aborting the rest.
 *
 * @param botToken - Bot API token.
 * @param chatId - Recipient's Telegram ID (== private-chat chat_id).
 * @param notification - Group details to render into the message.
 */
async function sendGroupNotification(
  botToken: string,
  chatId: number,
  notification: GroupNotification,
): Promise<{ chatId: number; ok: boolean; error?: string }> {
  const { code, title, hostName, expiresAt } = notification;
  const text = `New group: ${title}\nHost: ${hostName}\nExpires ${formatExpiry(expiresAt)}`;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[{ text: 'View Group', url: buildInviteLink(code) }]],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { chatId, ok: false, error: `${res.status} ${body}` };
    }
    return { chatId, ok: true };
  } catch (e) {
    return { chatId, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Broadcasts a new-group notification to many recipients in parallel,
 * isolating per-recipient failures (e.g. 403 blocked bot) via
 * Promise.allSettled so one bad chat_id never affects the others.
 *
 * @param botToken - Bot API token.
 * @param chatIds - Recipient Telegram IDs.
 * @param notification - Group details to render into the message.
 */
export async function broadcastGroupNotification(
  botToken: string,
  chatIds: number[],
  notification: GroupNotification,
): Promise<void> {
  if (chatIds.length === 0) return;
  const results = await Promise.allSettled(
    chatIds.map((chatId) => sendGroupNotification(botToken, chatId, notification)),
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && !r.value.ok) {
      console.warn(`[telegram] notify failed for ${r.value.chatId}: ${r.value.error}`);
    } else if (r.status === 'rejected') {
      console.warn('[telegram] notify threw unexpectedly', r.reason);
    }
  }
}
