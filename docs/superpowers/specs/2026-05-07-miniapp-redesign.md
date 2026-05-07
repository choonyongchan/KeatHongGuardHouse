# Miniapp Redesign Spec

**Date:** 2026-05-07  
**Goal:** Redesign the Telegram miniapp to be aesthetically pleasing, minimal-click, and easy to navigate for a group food-order matchmaking use case.

---

## Design Decisions

| Dimension | Decision |
|---|---|
| Style | Clean & Minimal — card-based, soft shadows, rounded corners |
| Accent color | `#22c55e` (fresh green) — status badges, buttons, active states |
| Error/destructive | `#ef4444` (red) — cancel, leave, full status |
| Navigation | Keep 4 tabs: Browse · Create · My Groups · Settings |
| Create flow | Stepper trimmed to 4 steps — drop confirm screen, create on step 4 |
| Join flow | Inline Join button on each open group card — 1 tap to join |
| Background | `#f7faf8` (very light green-tinted white) for page backgrounds |
| Card background | `#ffffff` with `box-shadow: 0 1px 6px rgba(0,0,0,.07)` |
| Border radius | Cards: `14px` · Chips/badges: `20px` · Buttons: `10px` · Inputs: `10px` |

---

## Color Tokens

Introduce `src/lib/theme.ts` with typed constants used everywhere instead of inline hex:

```ts
export const theme = {
  accent: '#22c55e',
  accentLight: '#f0fff4',
  accentBorder: '#bbf7d0',
  error: '#ef4444',
  errorLight: '#fee2e2',
  errorBorder: '#fecaca',
  textPrimary: '#111111',
  textSecondary: '#888888',
  textMuted: '#aaaaaa',
  cardBg: '#ffffff',
  pageBg: '#f7faf8',
  border: '#e5e5e5',
  shadow: '0 1px 6px rgba(0,0,0,.07)',
} as const;
```

All existing `var(--tg-theme-*)` usages for accent/status colors are replaced with these tokens. Telegram theme vars are still used for `AppRoot` platform theming only.

---

## Component Changes

### `GroupCard.tsx`
- Full redesign: emoji icon box (38×38, rounded 10px, `accentLight` bg) + title + meta row + status badge
- Accepts optional `actions` prop: `{ label: string; style: 'primary'|'outline'|'danger'; onClick: () => void }[]`
  - Browse: `[{ label: 'Details', style: 'outline' }, { label: 'Join', style: 'primary' }]` (open groups only)
  - My Groups leading: `[{ label: 'Details', style: 'outline' }, { label: 'Cancel Group', style: 'danger' }]`
  - My Groups joined: `[{ label: 'Details', style: 'outline' }, { label: 'Leave', style: 'outline' }]`
- Full/expired/cancelled groups: no `actions` passed, card at 55% opacity
- Status badges: pill shape, color-coded (open=green, full=red, expired/cancelled=muted)
- Meta line: `{joined} of {max} spots · {timeLeft}` + `by {creator} · {platform}`
- Platform extracted from order link domain (grab.com → GrabFood, foodpanda.com → Foodpanda, else bare domain)

### `BrowsePage.tsx`
- Page header: bold "Browse" title + subtitle `"{n} groups open"` (or "No open groups")
- Join-by-code input: placeholder "Have a code? Enter it…" · button label "Go"
- Empty state: `No open groups. Start one?` with a button linking to Create tab
- Loading state: centered spinner (unchanged pattern, just restyled)
- Group list: `GroupCard` components with 8px gap, no section wrappers

### `GroupDetailSheet.tsx`
- Keep bottom sheet pattern (still needed for "Details" button on cards)
- Redesigned header: drag handle + group title + meta (creator · platform · time left)
- Members section: "Members (n/max)" label + list of names with 👑 for creator
- Action button: context-dependent (Join / Leave / Cancel) — same logic, new styles
- Order link button: "Open {platform} link →" in outline style
- Triggered by "Details" tap, not card tap

### `CreateGroupStepper.tsx`
**Steps reduced from 5 to 4 — remove the Confirm step:**

| Step | Title (new copy) | Notes |
|---|---|---|
| 1 | What are you ordering? | Free-text input for group name |
| 2 | Paste your order link | URL input (GrabFood / Foodpanda) |
| 3 | How many spots? | Chip selector: 2 4 8 16 32 + "No Limit" + "Custom" |
| 4 | When does it close? | Chip selector: 30m 1h 2h 4h + "Custom" · button becomes "Create Group ✓" |

- Progress bar: 4 filled segments, `1 of 4` counter on right
- Step titles shorter and action-oriented (see copy table below)
- Back/Next buttons: Back = outline, Next/Create = filled green
- On step 4, Next becomes "Create Group ✓" and submits directly

**Step 3 — Spots:**
- Chips: `2` `4` `8` `16` `32` `No Limit` `Custom`
- "No Limit" maps to `null` in the API payload (`max_members = null`)
- "Custom" reveals a numeric input (min: 2, no upper cap) for an arbitrary member count

**Step 4 — Expiry:**
- Chips: `30m` `1h` `2h` `4h` `Custom`
- Selecting "Custom" reveals a time picker input (HTML `<input type="time">`) for the user to choose a specific clock time for expiry (same day)
- Displayed as "Closes at HH:MM" below the picker once selected
- Validation: chosen time must be at least 15 minutes in the future

### `MyGroupsPage.tsx`
- Page header: bold "My Groups" title
- Two sections: `LEADING` and `JOINED` (uppercase small labels, 0.5px letter-spacing)
- Each group card: same `GroupCard` redesign
  - Leading groups: action buttons = `Details` + `Cancel Group` (red outline)
  - Joined groups: action buttons = `Details` + `Leave` (grey outline)
- Empty state per section: "You're not leading any groups" / "You haven't joined any groups"

### `SettingsPage.tsx`
- Minimal changes — keep `Section` + `Cell` + `Switch` pattern from telegram-ui
- Update copy: "Notifications" section header, "Notify me when groups open" cell label
- Feedback button: "Send Feedback" (was "Submit Feedback")
- About section: keep as-is

### `App.tsx` (tab bar)
- Tab labels: Browse · Create · Mine · Settings (was: Browse · Create · My Groups · Settings)
- Active tab color: `#22c55e`

---

## Copy Changes

| Before | After |
|---|---|
| Browse Food Groups | Browse |
| My Food Groups | My Groups / Mine (tab) |
| Groups You Lead | LEADING |
| Groups You've Joined | JOINED |
| No groups found. Be the first to create one! | No open groups. Start one? |
| What would you like to name your food group? | What are you ordering? |
| Please enter the GrabFood or Foodpanda URL for the group order | Paste your order link |
| How many people are in your group? | How many spots? (2/4/8/16/32, No Limit, or Custom) |
| When should the group expire? | When does it close? (30m/1h/2h/4h or Custom time) |
| Review your group details | *(removed — no confirm step)* |
| Create Food Group | Create Group ✓ |
| Open GrabFood / Order Link | Open {platform} link → |
| Successfully joined the group! | You're in! |
| Successfully left the group. | Left the group. |
| Successfully cancelled the group. | Group cancelled. |
| Enter invite code | Have a code? Enter it… |
| Join | Go (code input button) |

---

## Files to Modify

1. `miniapp/src/lib/theme.ts` — **new file**, color/spacing tokens
2. `miniapp/src/components/GroupCard.tsx` — full redesign
3. `miniapp/src/pages/BrowsePage.tsx` — header, empty state, join-by-code copy
4. `miniapp/src/components/GroupDetailSheet.tsx` — redesigned sheet layout
5. `miniapp/src/components/CreateGroupStepper.tsx` — 4 steps, new copy, remove confirm step
6. `miniapp/src/pages/MyGroupsPage.tsx` — section labels, action buttons on cards
7. `miniapp/src/pages/SettingsPage.tsx` — copy tweaks only
8. `miniapp/src/components/App.tsx` — tab label "My Groups" → "Mine", active color
9. `miniapp/src/index.css` — set `body { background: #f7faf8 }` for page bg

---

## Accessibility & Guidelines

Per Web Interface Guidelines:
- All icon-only buttons get `aria-label`
- Join/Leave/Cancel buttons maintain loading state during API calls (disable + spinner)
- Errors shown inline below the relevant input
- `tabIndex` and `onKeyDown` on custom clickables (existing pattern, maintained)
- No `transition: all` — only animate `opacity` and `transform`
- Status badges use color + text (not color alone) for accessibility

---

## Verification

1. `cd miniapp && bun run dev` — confirm dev server starts
2. Visually check Browse tab: cards render with inline Join button; full groups show no button
3. Tap Join on an open group — confirm 1-tap join works, success toast "You're in!"
4. Open Details on a card — confirm bottom sheet opens with member list and action button
5. Navigate to Create tab — confirm 4-step stepper, step 4 button says "Create Group ✓"
6. Check My Groups — confirm LEADING/JOINED sections, Cancel/Leave buttons on cards
7. `bun run build` — confirm TypeScript and build pass with zero errors
