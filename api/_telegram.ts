/**
 * @fileoverview Outbound bot DMs (raw fetch to sendMessage). Never throws:
 * a failed DM must never fail the request that triggered it.
 */

import { categoryOf, type GroupDetail } from '../shared/rules.js';
import { formatExpiry, inviteLink, memberName } from '../shared/format.js';

const INVITE_LINK_BASE = process.env.VITE_INVITE_LINK_BASE || 'https://t.me/keat_hong_guard_house_bot/app';

type Button = { text: string; url: string };

async function sendMessage(chatId: number, text: string, buttons: Button[]): Promise<void> {
  const token = process.env.BOT_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: { inline_keyboard: buttons.map((b) => [b]) },
      }),
    });
    if (!res.ok) console.warn(`[telegram] DM to ${chatId} failed: ${res.status} ${await res.text().catch(() => '')}`);
  } catch (e) {
    console.warn(`[telegram] DM to ${chatId} threw`, e);
  }
}

// ponytail: fires all DMs at once; Telegram caps ~30 msg/s, so batch with a
// delay (or a queue) once a category has more than ~30 subscribers.
function sendAll(chatIds: number[], text: string, buttons: Button[]): Promise<unknown> {
  return Promise.all(chatIds.map((id) => sendMessage(id, text, buttons)));
}

const viewButton = (code: string): Button => ({ text: 'View group', url: inviteLink(INVITE_LINK_BASE, code) });

/** t.me link if the user has a username; tg://user otherwise (works inside Telegram clients). */
function chatButton(text: string, userId: number, username: string | null): Button {
  return { text, url: username ? `https://t.me/${username}` : `tg://user?id=${userId}` };
}

function slots(g: GroupDetail): string {
  return g.maxMembers === null ? `${g.currentCount} joined` : `${g.currentCount}/${g.maxMembers}`;
}

export function notifyNewGroup(chatIds: number[], g: GroupDetail): Promise<unknown> {
  const c = categoryOf(g.category);
  const text = `${c.emoji} New ${c.label} group: ${g.title}\n`
    + `Leader: ${memberName(g.creatorFirstName, g.creatorUsername)}\n`
    + `Closes ${formatExpiry(g.expiresAt)}`;
  return sendAll(chatIds, text, [viewButton(g.code)]);
}

/**
 * Sent on every join (the group has ≥ 2 people from the first join on):
 * the joiner is pointed at the leader, the leader learns who joined.
 */
export function notifyJoin(g: GroupDetail, joinerId: number): Promise<unknown> {
  const joiner = g.members.find((m) => m.userId === joinerId);
  if (!joiner) return Promise.resolve();
  const leader = memberName(g.creatorFirstName, g.creatorUsername);
  const full = g.status === 'full' ? '\nThe group is now full.' : '';
  // In the text, not a button: a malformed URL in a button makes Telegram reject the whole message.
  const link = g.externalLink ? `\nLink: ${g.externalLink}` : '';

  return Promise.all([
    sendMessage(
      joinerId,
      `✅ You joined "${g.title}" (${slots(g)}).\nYour leader is ${leader}. Message them to coordinate.${link}${full}`,
      [chatButton(`Message ${leader}`, g.creatorId, g.creatorUsername), viewButton(g.code)],
    ),
    sendMessage(
      g.creatorId,
      `👋 ${memberName(joiner.firstName, joiner.username)} joined "${g.title}" (${slots(g)}).${full}`,
      [chatButton(`Message ${memberName(joiner.firstName, joiner.username)}`, joiner.userId, joiner.username), viewButton(g.code)],
    ),
  ]);
}
