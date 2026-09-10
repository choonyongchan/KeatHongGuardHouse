/**
 * @fileoverview One-time (idempotent) Telegram bot bootstrap. Points the webhook
 * at the deployed /api/bot route, registers the command list, sets the persistent
 * web_app menu button, and publishes the bot's description text.
 *
 * Run with `bun run telegram:setup`. Bun auto-loads .env.local, so no explicit
 * env loading is needed. Uses raw fetch rather than grammY — matching
 * api/_telegram.ts's style, and keeping this script free of the bot runtime.
 *
 * Re-run it after changing any copy in api/_botCopy.ts, after rotating
 * TELEGRAM_WEBHOOK_SECRET, or after the deployment URL changes.
 */

import {
  BOT_COMMANDS,
  OPEN_APP_BUTTON_TEXT,
  BOT_DESCRIPTION,
  BOT_SHORT_DESCRIPTION,
} from '../api/_botCopy.ts';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Asserts a required environment variable is present, failing with a usable
 * message rather than sending a half-configured request to Telegram.
 *
 * Throws rather than calling process.exit so the narrowing holds without
 * relying on process.exit's `never` return type — scripts/ sits outside
 * tsconfig.json, so Node's types are not always in scope here. main()'s catch
 * prints the same message and exits 1.
 *
 * @param value - The environment variable's value.
 * @param name - The variable name, used in the error message.
 * @returns The value, narrowed to a string.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is unset. Add it to .env.local (see .env.example).`);
  }
  return value;
}

/**
 * Calls one Bot API method, throwing on a non-ok response so a typo or a bad
 * payload fails loudly instead of leaving the bot half-configured.
 *
 * @param method - Bot API method name, e.g. 'setWebhook'.
 * @param payload - JSON body for the method.
 * @returns The method's `result` field.
 */
async function callApi(method: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { ok: boolean; result?: unknown };
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  console.log(`✓ ${method}`);
  return json.result;
}

async function main(): Promise<void> {
  required(botToken, 'BOT_TOKEN');
  const url = required(webAppUrl, 'WEB_APP_URL');
  const secret = required(secretToken, 'TELEGRAM_WEBHOOK_SECRET');

  // Telegram rejects non-HTTPS URLs for both web_app buttons and setWebhook,
  // and t.me links are not accepted in either — catch that here, not mid-run.
  if (!url.startsWith('https://')) {
    console.error(`✗ WEB_APP_URL must be an https:// URL, got: ${url}`);
    process.exit(1);
  }

  // allowed_updates limits Telegram to plain messages: no edits, reactions or
  // chat-member changes. Fewer function invocations, smaller attack surface.
  // Widen it deliberately if callback queries are ever added.
  await callApi('setWebhook', {
    url: `${url}/api/bot`,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });

  await callApi('setMyCommands', { commands: BOT_COMMANDS });

  // Omitting chat_id sets the DEFAULT menu button for every private chat.
  await callApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: OPEN_APP_BUTTON_TEXT,
      web_app: { url },
    },
  });

  await callApi('setMyDescription', { description: BOT_DESCRIPTION });
  await callApi('setMyShortDescription', { short_description: BOT_SHORT_DESCRIPTION });

  const info = (await callApi('getWebhookInfo', {})) as {
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  };
  console.log('\nWebhook status:');
  console.log(`  url                  ${info.url}`);
  console.log(`  pending_update_count ${info.pending_update_count}`);
  console.log(`  last_error_message   ${info.last_error_message ?? '(none)'}`);
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
