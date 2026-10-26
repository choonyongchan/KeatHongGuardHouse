/**
 * @fileoverview POST /api/bot — Telegram Bot API webhook.
 *
 * The bot itself is deliberately minimal: its only job is to hand users a way
 * into the Mini App. Every command (/start, /app, /new, /help) replies with an
 * inline web_app button, optionally landing on a specific tab; the
 * persistent menu button next to the message input is configured separately by
 * scripts/setup-telegram.ts.
 *
 * Deliberately NOT wrapped in withAuth: bot updates carry no initData, so the
 * api/_response.ts wrapper is unusable here. Telegram instead echoes back the
 * secret set via setWebhook in the X-Telegram-Bot-Api-Secret-Token header, and
 * grammY compares it before running any middleware (401 on mismatch).
 */

import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { BOT_COMMANDS, COMMAND_REPLIES } from './_botCopy.js';

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

// Fail fast at module scope. A misconfigured deploy should 500 loudly on the
// first update rather than silently reply with a broken button.
if (!token) throw new Error('BOT_TOKEN is unset');
if (!webAppUrl) throw new Error('WEB_APP_URL is unset');
if (!secretToken) throw new Error('TELEGRAM_WEBHOOK_SECRET is unset');

// botInfo is intentionally not hardcoded: webhookCallback calls bot.init()
// lazily, costing one getMe per cold start. Passing a literal botInfo object
// would skip that, at the price of a nine-field snapshot that silently rots if
// the bot is ever renamed. Revisit only if cold-start latency becomes a problem.
const bot = new Bot(token);

for (const { command } of BOT_COMMANDS) {
  const { text, button, tab } = COMMAND_REPLIES[command];
  const url = tab ? `${webAppUrl}/?tab=${tab}` : webAppUrl;

  bot.command(command, async (ctx) => {
    // web_app buttons are private-chat only — sending one to a group or channel
    // fails with BUTTON_TYPE_INVALID, so stay silent there.
    if (ctx.chat.type !== 'private') return;

    // The /start payload (ctx.match) is ignored on purpose. Every share link the
    // app generates is a t.me "?startapp=CODE" direct link (src/lib/share.ts),
    // which opens the Mini App without ever producing a /start message. A payload
    // could not be threaded through this button anyway: start_param is populated
    // only by startapp= on a t.me link, never by a raw web_app URL. If a ?start=
    // flow is ever wanted, the fix is a url button pointing at buildInviteLink().
    await ctx.reply(text, { reply_markup: new InlineKeyboard().webApp(button, url) });
  });
}

// Not optional: grammY's default error handler rethrows, which Vercel surfaces
// as a 500 — and Telegram retries a failed update with backoff, meaning
// duplicate DMs. Swallow and log so Telegram always sees a 200.
bot.catch((err) => {
  console.error(`[bot] update ${err.ctx.update.update_id} failed:`, err.error);
});

// 'next-js' rather than 'https': Vercel's addHelpers already reads the request
// body eagerly and exposes it as req.body, which is exactly what this adapter
// consumes. VercelResponse supplies the status/json/send/end methods it needs.
// The 'https' adapter would instead re-read the request stream, which only
// works via a monkey-patched replay — this route avoids depending on that.
export default webhookCallback(bot, 'next-js', {
  secretToken,
  onTimeout: 'return',
  timeoutMilliseconds: 8_000,
});
