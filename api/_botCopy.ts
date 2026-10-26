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

/** Bot display name. Telegram caps this at 64 chars; the @username is BotFather-only. */
export const BOT_NAME = 'KeatHong GuardHouse 🎮';

/** Label for the persistent chat menu button and the default inline web_app button. */
export const OPEN_APP_BUTTON_TEXT = '🎮 Open App';

/** Spelled out for first-time Mini App users: where the button is and that nothing installs. */
const WELCOME_TEXT =
  'Welcome to KeatHong GuardHouse! 👋\n\n' +
  "Here's how it works:\n" +
  '🍔 Join a group: split delivery fees, share a ride, find gaming buddies\n' +
  "✨ Start your own: pick what it's for, then share the link\n" +
  '🔔 Get a ping whenever a new group opens\n\n' +
  '👇 Tap Open App below. It opens inside Telegram, nothing to install.\n\n' +
  'Lost it later? Tap 🎮 Open App beside the message box anytime.';

/**
 * Every command replies with `text` above a web_app button. `tab` lands the app on
 * that tab via `?tab=` (read once in src/components/App.tsx). Not a `#/path`:
 * Telegram appends launch data to the hash, which would clobber the route.
 */
export const COMMAND_REPLIES = {
  start: { text: WELCOME_TEXT, button: OPEN_APP_BUTTON_TEXT, tab: '' },
  app: { text: '👇 Tap to see the groups open right now.', button: OPEN_APP_BUTTON_TEXT, tab: '' },
  new: { text: '✨ Food run, ride or game? Tap to start your group.', button: '✨ Start a group', tab: 'create' },
  help: { text: WELCOME_TEXT, button: '❓ How it works', tab: 'settings' },
} as const;

/** Registered via setMyCommands; shown when a user types "/" in the chat. Order = menu order. */
export const BOT_COMMANDS: { command: keyof typeof COMMAND_REPLIES; description: string }[] = [
  { command: 'start', description: 'Welcome + open the app' },
  { command: 'app', description: 'Browse open groups' },
  { command: 'new', description: 'Start a new group' },
  { command: 'help', description: 'How it works' },
];

/** The "What can this bot do?" card on an empty chat. Telegram caps this at 512 chars. */
export const BOT_DESCRIPTION =
  '👋 Hey neighbour! Find buddies in Keat Hong to split food delivery fees, share rides or squad up for games.\n\n' +
  'How it works:\n' +
  '1️⃣ Tap START below\n' +
  '2️⃣ Tap 🎮 Open App, the button beside the message box\n' +
  '3️⃣ Join a group, or start your own in seconds\n\n' +
  "It's a mini app: it opens right here in Telegram. No download, no sign-up.";

/** Bio shown under the bot's name on its profile. Telegram caps this at 120 chars. */
export const BOT_SHORT_DESCRIPTION =
  'Split food orders, share rides & find gaming buddies in Keat Hong. Opens right inside Telegram, nothing to download.';
