/**
 * @fileoverview Centralised user-facing copy for the Telegram bot. Shared by the
 * webhook route (api/bot.ts) and the one-time bootstrap script
 * (scripts/setup-telegram.ts) so the inline button label in the chat and the
 * label on the persistent menu button can never drift apart.
 *
 * Plain text only — no parse_mode anywhere, matching api/_telegram.ts. Keeping
 * every outbound message unformatted avoids the Markdown-escaping bug class
 * that the old (deleted) escapeMd helper existed to work around.
 */

/** Reply to /start in a private chat. Sits directly above the "Open App" button. */
export const WELCOME_TEXT =
  'Welcome to KeatHong GuardHouse 👋\n\n' +
  'Connect with neighbours for Grab/Foodpanda order-in discounts, carpool ' +
  'buddies, gaming buddies and more.\n\n' +
  'Tap the button below to get started!';

/** Label for both the inline web_app button and the persistent chat menu button. */
export const OPEN_APP_BUTTON_TEXT = 'Open App';

/** Registered via setMyCommands; shown when a user types "/" in the chat. */
export const BOT_COMMANDS = [
  { command: 'start', description: 'Open KeatHong GuardHouse' },
] as const;

/** The "What can this bot do?" card on an empty chat. Telegram caps this at 512 chars. */
export const BOT_DESCRIPTION =
  'Connect with neighbours in Keat Hong for Grab/Foodpanda order-in discounts, ' +
  'carpool buddies, gaming buddies and more.\n\n' +
  'Create a group, share the code, and fill it up — or browse what your ' +
  'neighbours have already started.';

/** Bio shown under the bot's name on its profile. Telegram caps this at 120 chars. */
export const BOT_SHORT_DESCRIPTION =
  'Find neighbours in Keat Hong to share food delivery orders, carpools and games with.';
