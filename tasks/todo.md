# Add a Mini App launch button to the Telegram bot

Full plan: `~/.claude/plans/let-s-update-our-telegram-cheerful-penguin.md`

## Problem

`@keat_hong_guard_house_bot` had no bot code at all — every handler was deleted in
`dacc50b` when the product moved from a telegram-native bot to a Mini App, and nothing
replaced them. `/start` got no reply, so the only way into the app was a `?startapp=`
deep link someone shared with you. Target interface: `example.PNG` (Telegram's
"Durger King" demo).

## Tasks

- [x] Add `grammy` dependency (`grammy@1.46.0`) + `telegram:setup` script
- [x] Document `WEB_APP_URL` and `TELEGRAM_WEBHOOK_SECRET` in `.env.example`
- [x] `api/_botCopy.ts` — shared bot copy, so the inline and menu button labels can't drift
- [x] `api/bot.ts` — webhook route; `/start` → welcome + inline `web_app` button
- [x] `scripts/setup-telegram.ts` — setWebhook / setMyCommands / setChatMenuButton /
      setMyDescription / setMyShortDescription
- [x] Update `.claude/architecture_pattern.md`
- [x] Verify: build, lint, type-check, offline handler tests
- [ ] **User:** set the two env vars in Vercel, deploy, run `bun run telegram:setup`
- [ ] **User:** upload the description picture in BotFather (not automatable)

## Review

### What changed

| File | Change |
|---|---|
| `api/_botCopy.ts` | new — `WELCOME_TEXT`, `OPEN_APP_BUTTON_TEXT`, `BOT_COMMANDS`, `BOT_DESCRIPTION`, `BOT_SHORT_DESCRIPTION` |
| `api/bot.ts` | new — `POST /api/bot`, one command, ~65 lines |
| `scripts/setup-telegram.ts` | new — idempotent bootstrap, raw fetch |
| `package.json` | `grammy` dep + `telegram:setup` script |
| `.env.example` | `WEB_APP_URL`, `TELEGRAM_WEBHOOK_SECRET` |
| `.claude/architecture_pattern.md` | directory map, `scripts/`, §4 bot-webhook section, API table row |

`vercel.json` needed no change — its `/((?!api/).*)` rewrite already excludes `/api/`.

### Deviation from the approved plan: `next-js` adapter, not `https`

The plan specified `webhookCallback(bot, 'https')` plus a warning never to touch
`req.body`, on the theory that `@vercel/node` exposes `req.body` as a lazy getter over
the request stream. Reading the actual source disproved that. In
`node_modules/@vercel/node/dist/dev-server.mjs`:

- `addHelpers` (~line 1081) calls `await readBody(req)` — the body is read **eagerly**,
  before the handler runs, regardless of whether anything touches `req.body`.
- `restoreBody` (~line 1064) then monkey-patches `req.on`/`req.addListener` so `'data'`
  and `'end'` replay from a pre-filled `PassThrough`.
- `req.body` is therefore a lazy *parser* over an already-buffered Buffer.

So the "never log `req.body`" hazard was not real, and `https` would have worked only by
leaning on that stream-replay patch. grammY's `next-js` adapter reads `request.body` and
responds via `res.status().json()` — and Vercel's helpers are deliberately Next.js-shaped
(`NextAdapter` is structurally typed, with no dependency on the `next` package), so it is
the exact fit. Switched, and recorded the reasoning in both the code and the arch doc.

### Verification

- `bun run build` — passes. `grammy` stays out of the client bundle (`api/` is a separate
  build target and nothing in `src/` imports it); `dist/assets/index-*.js` unchanged at 377 kB.
- `bun run lint` — exit 0.
- Type-check of the new files (nothing in the repo type-checks `api/`, so this was a
  one-off): `tsc --noEmit --ignoreConfig --strict ... api/bot.ts api/_botCopy.ts
  scripts/setup-telegram.ts` — exit 0.
- `bun run telegram:setup` — correctly exits 1 with `✗ WEB_APP_URL is unset` before any
  network call, confirming both the import graph and the guard.
- Offline handler tests (scratchpad, 5/5 pass). grammY's Node shim pulls `fetch` from
  `node-fetch`, not `globalThis.fetch`, so that module was mocked to keep all traffic local:

  | Case | Result |
  |---|---|
  | `/start` in a private chat | 200; exactly one `sendMessage`; `reply_markup.inline_keyboard[0][0]` is `{text:'Open App', web_app:{url:'https://keat-hong-guard-house-6vg5.vercel.app'}}`; no `parse_mode` |
  | No secret header | 401, nothing sent |
  | Wrong secret | 401, nothing sent |
  | Non-command message | 200, nothing sent |
  | `/start` in a supergroup | 200, nothing sent (`web_app` buttons are private-chat only) |

**Not verified end-to-end**: the live Telegram round-trip and the chat menu button both
need `WEB_APP_URL` + `TELEGRAM_WEBHOOK_SECRET` set in Vercel and a deploy — the two
unchecked boxes above.

### Follow-ups (not in this change)

- A `typecheck:api` script with its own tsconfig covering `api/` and `scripts/`. Nothing
  currently type-checks them; Vercel transpiles with esbuild only.
- `.claude/architecture_pattern.md` is stale beyond this change: §7 still says "No ORM —
  raw SQL" though `bfca157` moved to Drizzle, and the map lists 4 tabs /
  `GroupDetailSheet.tsx` where the code has 5 tabs / `GroupDetailPanel.tsx`.
