# Miniapp Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Telegram miniapp with clean cards, green accent, inline Join buttons, a 4-step create stepper, and concise copy throughout.

**Architecture:** Introduce a `theme.ts` constants file used by all components; redesign `GroupCard` to accept an `actions` prop so Browse and MyGroups can inject context-specific buttons; trim `CreateGroupStepper` from 5 to 4 steps with custom spots/expiry options.

**Tech Stack:** React 19, TypeScript, `@telegram-apps/telegram-ui`, `@tma.js/sdk-react`, SWR, Vite/Bun

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `miniapp/src/lib/theme.ts` | Color + shadow tokens |
| Modify | `miniapp/src/types.ts` | `max_members: number \| null` |
| Modify | `miniapp/src/lib/api.ts` | `createGroup` payload with nullable maxMembers |
| Modify | `miniapp/src/components/GroupCard.tsx` | Redesigned card with `actions` prop |
| Modify | `miniapp/src/components/JoinByCodeInput.tsx` | Copy + style update |
| Modify | `miniapp/src/pages/BrowsePage.tsx` | Header, inline join wiring, empty state |
| Modify | `miniapp/src/components/GroupDetailSheet.tsx` | Redesigned sheet layout |
| Modify | `miniapp/src/components/CreateGroupStepper.tsx` | 4-step stepper with custom chips |
| Modify | `miniapp/src/pages/MyGroupsPage.tsx` | LEADING/JOINED sections + card actions |
| Modify | `miniapp/src/pages/SettingsPage.tsx` | Copy tweaks only |
| Modify | `miniapp/src/components/App.tsx` | Active tab color |
| Modify | `miniapp/src/index.css` | Page background color |

---

## Task 1: Color Tokens

**Files:**
- Create: `miniapp/src/lib/theme.ts`

- [ ] **Step 1: Create theme.ts**

```typescript
// miniapp/src/lib/theme.ts
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

- [ ] **Step 2: Verify it compiles**

```bash
cd miniapp && bun run build 2>&1 | head -20
```
Expected: no errors (new file, unused yet — that's fine).

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/lib/theme.ts
git commit -m "feat: add theme color tokens"
```

---

## Task 2: Update Types for Nullable max_members

**Files:**
- Modify: `miniapp/src/types.ts`

The `max_members` field needs to accept `null` so "No Limit" groups can be represented.

- [ ] **Step 1: Update FoodGroup interface**

In `miniapp/src/types.ts`, change line:
```typescript
  max_members: number;
```
to:
```typescript
  max_members: number | null;
```

- [ ] **Step 2: Verify build catches any type errors**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: TypeScript may flag usages of `max_members` that assume it's always a number. Note any errors — they will be fixed in the component tasks below.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/types.ts
git commit -m "feat: allow max_members to be null for No Limit groups"
```

---

## Task 3: Update API Client for Nullable maxMembers

**Files:**
- Modify: `miniapp/src/lib/api.ts`

- [ ] **Step 1: Update createGroup payload type**

In `miniapp/src/lib/api.ts`, change the `createGroup` function signature from:
```typescript
export function createGroup(payload: {
  title: string;
  externalLink: string;
  maxMembers: number;
  expiryMinutes: number;
}): Promise<FoodGroup> {
```
to:
```typescript
export function createGroup(payload: {
  title: string;
  externalLink: string;
  maxMembers: number | null;
  expiryMinutes: number;
}): Promise<FoodGroup> {
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/lib/api.ts
git commit -m "feat: allow null maxMembers in createGroup API call"
```

---

## Task 4: Redesign GroupCard

**Files:**
- Modify: `miniapp/src/components/GroupCard.tsx`

`GroupCard` gains an `actions` prop — an array of button descriptors. The `onTap` prop is removed; callers supply explicit action buttons instead.

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/components/GroupCard.tsx
import type { FoodGroup } from '../types.ts';
import { formatCountdown } from '../lib/formatters.ts';
import { theme } from '../lib/theme.ts';

export interface CardAction {
  label: string;
  style: 'primary' | 'outline' | 'danger';
  onClick: () => void;
  loading?: boolean;
}

interface GroupCardProps {
  group: FoodGroup;
  actions?: CardAction[];
}

function statusBadge(status: FoodGroup['status']): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case 'open':      return { label: 'OPEN',      bg: theme.accentLight, color: theme.accent,      border: theme.accentBorder };
    case 'full':      return { label: 'FULL',       bg: theme.errorLight,  color: theme.error,       border: theme.errorBorder };
    case 'expired':   return { label: 'EXPIRED',    bg: '#f5f5f5',         color: theme.textMuted,   border: theme.border };
    case 'cancelled': return { label: 'CANCELLED',  bg: '#f5f5f5',         color: theme.textMuted,   border: theme.border };
  }
}

function platformLabel(link: string): string {
  try {
    const host = new URL(link).hostname;
    if (host.includes('grab.com'))      return 'GrabFood';
    if (host.includes('foodpanda.com')) return 'Foodpanda';
    return host.replace('www.', '');
  } catch {
    return '';
  }
}

function formatSpots(current: number, max: number | null): string {
  return max === null ? `${current} joined` : `${current} of ${max} spots`;
}

function actionButtonStyle(style: CardAction['style']): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: style === 'primary' ? 2 : 1,
    padding: '6px 0',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    textAlign: 'center',
  };
  if (style === 'primary') return { ...base, background: theme.accent, color: '#fff' };
  if (style === 'danger')  return { ...base, background: 'transparent', color: theme.error, border: `1.5px solid ${theme.error}` };
  return { ...base, background: 'transparent', color: theme.textSecondary, border: `1.5px solid ${theme.border}` };
}

export function GroupCard({ group, actions }: GroupCardProps) {
  const badge = statusBadge(group.status);
  const isActive = group.status === 'open' || group.status === 'full';
  const platform = group.external_link ? platformLabel(group.external_link) : '';

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        boxShadow: theme.shadow,
        opacity: isActive ? 1 : 0.55,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: actions?.length ? 10 : 0 }}>
        {/* Icon box */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: theme.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          🍽️
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 13, color: theme.textPrimary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {group.title}
          </div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            {formatSpots(group.current_count, group.max_members)}
            {isActive && ` · ${formatCountdown(group.expires_at)}`}
          </div>
          {(group.creator_first_name || platform) && (
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
              {[group.creator_first_name && `by ${group.creator_first_name}`, platform].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Status badge */}
        <span style={{
          background: badge.bg, color: badge.color,
          border: `1px solid ${badge.border}`,
          fontSize: 9, fontWeight: 700,
          padding: '3px 7px', borderRadius: 20, flexShrink: 0,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 7 }}>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              style={actionButtonStyle(action.style)}
              aria-label={action.label}
            >
              {action.loading ? '…' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: errors in `BrowsePage.tsx` and `MyGroupsPage.tsx` because they still pass `onTap` — those are fixed in Tasks 6 and 9.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/components/GroupCard.tsx
git commit -m "feat: redesign GroupCard with actions prop and theme tokens"
```

---

## Task 5: Update JoinByCodeInput Copy and Style

**Files:**
- Modify: `miniapp/src/components/JoinByCodeInput.tsx`

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/components/JoinByCodeInput.tsx
import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { getGroup } from '../lib/api.ts';
import type { FoodGroupDetail } from '../types.ts';
import { theme } from '../lib/theme.ts';

interface JoinByCodeInputProps {
  onGroupFound: (group: FoodGroupDetail) => void;
}

function sanitiseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

export function JoinByCodeInput({ onGroupFound }: JoinByCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const clean = sanitiseCode(code);
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const group = await getGroup(clean);
      onGroupFound(group);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Group not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '0 16px', marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Have a code? Enter it…"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            border: `1.5px solid ${error ? theme.error : theme.border}`,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            background: theme.cardBg,
            color: theme.textPrimary,
            outline: 'none',
          }}
          aria-label="Group invite code"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !sanitiseCode(code)}
          style={{
            background: theme.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !sanitiseCode(code) ? 'not-allowed' : 'pointer',
            opacity: loading || !sanitiseCode(code) ? 0.6 : 1,
            flexShrink: 0,
          }}
          aria-label="Look up group by code"
        >
          {loading ? <Spinner size="s" /> : 'Go'}
        </button>
      </div>
      {error && (
        <p style={{ color: theme.error, fontSize: 11, margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/components/JoinByCodeInput.tsx
git commit -m "feat: update JoinByCodeInput with new copy and theme styling"
```

---

## Task 6: Update BrowsePage

**Files:**
- Modify: `miniapp/src/pages/BrowsePage.tsx`

Cards now get `actions` instead of `onTap`. The join API call is triggered directly from the card button.

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/pages/BrowsePage.tsx
import { useState } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';
import { useNavigate } from 'react-router-dom';

import { getGroups, getGroup, joinGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';
import { JoinByCodeInput } from '../components/JoinByCodeInput.tsx';
import { theme } from '../lib/theme.ts';

function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
      <Spinner size="m" />
    </div>
  );
}

export function BrowsePage() {
  const { data: groups, error, mutate } = useSWR<FoodGroup[]>('/api/groups', getGroups, {
    refreshInterval: 30_000,
  });

  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;
  const navigate = useNavigate();

  async function handleDetails(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch {
      // ignore
    }
  }

  async function handleJoin(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setJoiningId(group.id);
    try {
      await joinGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch {
      hapticFeedback.notificationOccurred('error');
    } finally {
      setJoiningId(null);
    }
  }

  function handleGroupFound(group: FoodGroupDetail) {
    hapticFeedback.impactOccurred('light');
    setSelected(group);
  }

  const openCount = groups?.filter((g) => g.status === 'open').length ?? 0;

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>Browse</div>
        <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
          {groups
            ? openCount > 0 ? `${openCount} group${openCount === 1 ? '' : 's'} open` : 'No open groups'
            : ''}
        </div>
      </div>

      {/* Join by code */}
      <div style={{ marginBottom: 12 }}>
        <JoinByCodeInput onGroupFound={handleGroupFound} />
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {!groups && !error && <LoadingState />}

        {error && (
          <p style={{ color: theme.error, textAlign: 'center', marginTop: 32, fontSize: 13 }}>
            Failed to load groups.
          </p>
        )}

        {groups && groups.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>
              No open groups. Start one?
            </div>
            <button
              onClick={() => navigate('/create')}
              style={{
                background: theme.accent, color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '10px 24px', fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Create a Group
            </button>
          </div>
        )}

        {groups && groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            actions={g.status === 'open' ? [
              { label: 'Details', style: 'outline', onClick: () => handleDetails(g) },
              { label: 'Join', style: 'primary', onClick: () => handleJoin(g), loading: joiningId === g.id },
            ] : undefined}
          />
        ))}
      </div>

      {selected && (
        <GroupDetailSheet
          group={selected}
          currentUserId={userId}
          onClose={() => setSelected(null)}
          onMutated={() => void mutate()}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: BrowsePage errors resolved. MyGroupsPage may still error.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/pages/BrowsePage.tsx
git commit -m "feat: update BrowsePage with header, inline join, and empty state"
```

---

## Task 7: Redesign GroupDetailSheet

**Files:**
- Modify: `miniapp/src/components/GroupDetailSheet.tsx`

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/components/GroupDetailSheet.tsx
import { useState } from 'react';
import { Modal, Spinner } from '@telegram-apps/telegram-ui';
import type { FoodGroupDetail } from '../types.ts';
import { formatExpiry, formatMemberName, formatCountdown } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup } from '../lib/api.ts';
import { theme } from '../lib/theme.ts';

interface GroupDetailSheetProps {
  group: FoodGroupDetail;
  currentUserId: number;
  onClose: () => void;
  onMutated: () => void;
}

function resolveAction(group: FoodGroupDetail, userId: number): 'join' | 'leave' | 'cancel' | null {
  const isMember = group.members.some((m) => m.user_id === userId);
  const isCreator = group.creator_id === userId;
  const isActive = group.status === 'open' || group.status === 'full';
  if (!isActive) return null;
  if (isCreator) return 'cancel';
  if (isMember) return 'leave';
  if (group.status === 'open') return 'join';
  return null;
}

async function performAction(action: 'join' | 'leave' | 'cancel', code: string): Promise<void> {
  if (action === 'join')   await joinGroup(code);
  if (action === 'leave')  await leaveGroup(code);
  if (action === 'cancel') await cancelGroup(code);
}

function platformLabel(link: string): string {
  try {
    const host = new URL(link).hostname;
    if (host.includes('grab.com'))      return 'GrabFood';
    if (host.includes('foodpanda.com')) return 'Foodpanda';
    return host.replace('www.', '');
  } catch {
    return 'Order link';
  }
}

export function GroupDetailSheet({ group, currentUserId, onClose, onMutated }: GroupDetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = resolveAction(group, currentUserId);

  async function handleAction() {
    if (!action) return;
    setLoading(true);
    setError(null);
    try {
      await performAction(action, group.code);
      onMutated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const maxLabel = group.max_members === null ? '∞' : String(group.max_members);
  const platform = group.external_link ? platformLabel(group.external_link) : null;

  const actionLabel = action === 'join' ? 'Join Group' : action === 'leave' ? 'Leave' : 'Cancel Group';
  const actionBg = action === 'join' ? theme.accent : 'transparent';
  const actionColor = action === 'join' ? '#fff' : action === 'cancel' ? theme.error : theme.textSecondary;
  const actionBorder = action === 'join' ? 'none' : `1.5px solid ${action === 'cancel' ? theme.error : theme.border}`;

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      header={<Modal.Header after={<Modal.Close />}>{group.code}</Modal.Header>}
    >
      <div style={{ padding: '0 16px 32px' }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: theme.border, borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Title + meta */}
        <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary, marginBottom: 4 }}>
          {group.title}
        </div>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
          by {formatMemberName(group.creator_first_name, group.creator_username)}
          {' · '}
          {group.current_count}/{maxLabel} members
          {' · '}
          closes {formatExpiry(group.expires_at)} ({formatCountdown(group.expires_at)})
        </div>

        {/* Order link */}
        {group.external_link && (
          <a
            href={group.external_link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              marginBottom: 16,
              padding: '10px 14px',
              border: `1.5px solid ${theme.border}`,
              borderRadius: 10,
              color: theme.accent,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Open {platform} link →
          </a>
        )}

        {/* Members */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            color: theme.textSecondary, marginBottom: 8,
          }}>
            MEMBERS ({group.current_count}/{maxLabel})
          </div>
          {group.members.map((m) => (
            <div key={m.user_id} style={{
              fontSize: 13, color: theme.textPrimary,
              padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{m.user_id === group.creator_id ? '👑' : '·'}</span>
              {formatMemberName(m.first_name, m.username)}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: theme.error, fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        {/* Action button */}
        {action && (
          <button
            onClick={handleAction}
            disabled={loading}
            aria-label={actionLabel}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: actionBg,
              color: actionColor,
              border: actionBorder,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Spinner size="s" /> : actionLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/components/GroupDetailSheet.tsx
git commit -m "feat: redesign GroupDetailSheet with theme tokens and cleaner layout"
```

---

## Task 8: Redesign CreateGroupStepper (4 steps, custom chips)

**Files:**
- Modify: `miniapp/src/components/CreateGroupStepper.tsx`

Steps: Title → Link → Spots (2/4/8/16/32/No Limit/Custom) → Expiry (30m/1h/2h/4h/Custom). No confirm step — Create button is on step 4.

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/components/CreateGroupStepper.tsx
import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { createGroup } from '../lib/api.ts';
import type { FoodGroup } from '../types.ts';
import { theme } from '../lib/theme.ts';

interface GroupDraft {
  title: string;
  externalLink: string;
  maxMembers: number | null;   // null = No Limit
  customMembers: string;        // raw input when Custom selected
  expiryMinutes: number | null; // null = custom time chosen
  customTime: string;           // HH:MM string when Custom selected
}

const MEMBER_PRESETS = [2, 4, 8, 16, 32] as const;
const EXPIRY_PRESETS: { label: string; value: number }[] = [
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
  { label: '2h',  value: 120 },
  { label: '4h',  value: 240 },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const hintStyle: React.CSSProperties = {
  fontSize: 13, color: theme.textSecondary, marginBottom: 10, marginTop: 0,
};

function chipStyle(selected: boolean, danger = false): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 20,
    border: selected
      ? `2px solid ${danger ? theme.error : theme.accent}`
      : `1.5px solid ${theme.border}`,
    background: selected ? (danger ? theme.errorLight : theme.accentLight) : 'transparent',
    color: selected ? (danger ? theme.error : theme.accent) : theme.textSecondary,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  };
}

function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: '100%',
    border: `1.5px solid ${hasError ? theme.error : theme.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: theme.textPrimary,
    background: theme.cardBg,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

// ── Step sub-components ───────────────────────────────────────────────────────

interface StepProps {
  draft: GroupDraft;
  onChange: (patch: Partial<GroupDraft>) => void;
  error: string | null;
}

function StepTitle({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>Give your group a name people will recognise</p>
      <input
        placeholder="e.g. Supper at Al-Ameen"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={60}
        autoComplete="off"
        style={inputStyle(!!error)}
        aria-label="Group title"
      />
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepLink({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>Paste your GrabFood or Foodpanda cart link (optional)</p>
      <input
        placeholder="https://food.grab.com/…"
        value={draft.externalLink}
        onChange={(e) => onChange({ externalLink: e.target.value })}
        inputMode="url"
        autoComplete="off"
        style={inputStyle(!!error)}
        aria-label="Order link"
      />
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepMembers({ draft, onChange, error }: StepProps) {
  const isCustomSelected = draft.maxMembers !== null &&
    !MEMBER_PRESETS.includes(draft.maxMembers as typeof MEMBER_PRESETS[number]);
  const isNoLimit = draft.maxMembers === null;

  function selectPreset(n: number) {
    onChange({ maxMembers: n, customMembers: '' });
  }
  function selectNoLimit() {
    onChange({ maxMembers: null, customMembers: '' });
  }
  function selectCustom() {
    onChange({ maxMembers: -1, customMembers: '' }); // -1 = "custom mode active, no value yet"
  }

  return (
    <div>
      <p style={hintStyle}>How many people can join?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {MEMBER_PRESETS.map((n) => (
          <button key={n} onClick={() => selectPreset(n)} style={chipStyle(draft.maxMembers === n)}>
            {n}
          </button>
        ))}
        <button onClick={selectNoLimit} style={chipStyle(isNoLimit)}>No Limit</button>
        <button onClick={selectCustom} style={chipStyle(isCustomSelected)}>Custom</button>
      </div>
      {isCustomSelected && (
        <input
          type="number"
          min={2}
          placeholder="Enter number (min 2)"
          value={draft.customMembers}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ customMembers: val, maxMembers: val ? Math.max(2, parseInt(val, 10)) : -1 });
          }}
          style={inputStyle(!!error)}
          aria-label="Custom member count"
        />
      )}
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepExpiry({ draft, onChange, error }: StepProps) {
  const isCustomSelected = draft.expiryMinutes === null;
  const selectedValue = draft.expiryMinutes;

  function selectPreset(value: number) {
    onChange({ expiryMinutes: value, customTime: '' });
  }
  function selectCustom() {
    onChange({ expiryMinutes: null, customTime: '' });
  }

  return (
    <div>
      <p style={hintStyle}>Group closes after this time</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXPIRY_PRESETS.map(({ label, value }) => (
          <button key={value} onClick={() => selectPreset(value)} style={chipStyle(selectedValue === value)}>
            {label}
          </button>
        ))}
        <button onClick={selectCustom} style={chipStyle(isCustomSelected)}>Custom</button>
      </div>
      {isCustomSelected && (
        <div>
          <input
            type="time"
            value={draft.customTime}
            onChange={(e) => onChange({ customTime: e.target.value })}
            style={inputStyle(!!error)}
            aria-label="Custom close time"
          />
          {draft.customTime && (
            <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              Closes at {draft.customTime}
            </p>
          )}
        </div>
      )}
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, draft: GroupDraft): string | null {
  if (step === 0) {
    if (!draft.title.trim()) return 'Please enter a name';
    if (draft.title.length > 60) return 'Name must be under 60 characters';
  }
  if (step === 1) {
    if (draft.externalLink && !draft.externalLink.startsWith('http')) return 'Link must start with http';
  }
  if (step === 2) {
    if (draft.maxMembers === -1) return 'Please enter a valid number (min 2)';
  }
  if (step === 3) {
    if (draft.expiryMinutes === null) {
      if (!draft.customTime) return 'Please pick a time';
      const [h, m] = draft.customTime.split(':').map(Number);
      const chosen = new Date();
      chosen.setHours(h, m, 0, 0);
      if (chosen.getTime() - Date.now() < 15 * 60 * 1000) return 'Must be at least 15 minutes from now';
    }
  }
  return null;
}

// ── Resolve expiry minutes from draft ─────────────────────────────────────────

function resolveExpiryMinutes(draft: GroupDraft): number {
  if (draft.expiryMinutes !== null) return draft.expiryMinutes;
  const [h, m] = draft.customTime.split(':').map(Number);
  const chosen = new Date();
  chosen.setHours(h, m, 0, 0);
  return Math.max(1, Math.round((chosen.getTime() - Date.now()) / 60_000));
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i <= step ? theme.accent : theme.border,
          transition: 'background 0.2s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: theme.textMuted, whiteSpace: 'nowrap', marginLeft: 4 }}>
        {step + 1} of {total}
      </span>
    </div>
  );
}

// ── Step titles ───────────────────────────────────────────────────────────────

const STEP_HEADINGS = [
  'What are you ordering?',
  'Paste your order link',
  'How many spots?',
  'When does it close?',
];

// ── Main component ────────────────────────────────────────────────────────────

interface CreateGroupStepperProps {
  onCreated: (group: FoodGroup) => void;
}

export function CreateGroupStepper({ onCreated }: CreateGroupStepperProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GroupDraft>({
    title: '',
    externalLink: '',
    maxMembers: 4,
    customMembers: '',
    expiryMinutes: 60,
    customTime: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(patch: Partial<GroupDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  function handleNext() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup({
        title: draft.title.trim(),
        externalLink: draft.externalLink.trim(),
        maxMembers: draft.maxMembers === -1 ? null : draft.maxMembers,
        expiryMinutes: resolveExpiryMinutes(draft),
      });
      onCreated(group);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  const stepProps: StepProps = { draft, onChange: handleChange, error };
  const isLast = step === 3;

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <ProgressBar step={step} total={4} />

      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>
        {STEP_HEADINGS[step]}
      </h2>

      {step === 0 && <StepTitle {...stepProps} />}
      {step === 1 && <StepLink {...stepProps} />}
      {step === 2 && <StepMembers {...stepProps} />}
      {step === 3 && <StepExpiry {...stepProps} />}

      {isLast && error && (
        <p style={{ color: theme.error, fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        {step > 0 && (
          <button
            onClick={() => { setStep((s) => s - 1); setError(null); }}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: `1.5px solid ${theme.border}`,
              background: 'transparent', color: theme.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
        <button
          onClick={isLast ? handleSubmit : handleNext}
          disabled={loading}
          style={{
            flex: 2, padding: '11px 0', borderRadius: 10,
            border: 'none',
            background: loading ? theme.accentBorder : theme.accent,
            color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          }}
          aria-label={isLast ? 'Create group' : 'Next step'}
        >
          {loading ? <Spinner size="s" /> : isLast ? 'Create Group ✓' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/components/CreateGroupStepper.tsx
git commit -m "feat: redesign CreateGroupStepper — 4 steps, custom spots/expiry, theme tokens"
```

---

## Task 9: Update MyGroupsPage

**Files:**
- Modify: `miniapp/src/pages/MyGroupsPage.tsx`

- [ ] **Step 1: Replace the full file content**

```typescript
// miniapp/src/pages/MyGroupsPage.tsx
import { useState } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';

import { getMe, getGroup, cancelGroup, leaveGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail, UserProfile } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';
import { theme } from '../lib/theme.ts';

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      color: theme.textSecondary, marginBottom: 8,
    }}>
      {label}
    </div>
  );
}

function EmptySectionNote({ message }: { message: string }) {
  return (
    <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>{message}</p>
  );
}

export function MyGroupsPage() {
  const { data, error, mutate } = useSWR<UserProfile>('/api/users/me', getMe, {
    refreshInterval: 30_000,
  });
  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;

  async function handleDetails(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch {
      // ignore
    }
  }

  async function handleCancel(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setActionLoadingId(group.id);
    try {
      await cancelGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch {
      hapticFeedback.notificationOccurred('error');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleLeave(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setActionLoadingId(group.id);
    try {
      await leaveGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch {
      hapticFeedback.notificationOccurred('error');
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!data && !error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
        <Spinner size="m" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>My Groups</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* LEADING */}
        <SectionLabel label="LEADING" />
        {data?.createdGroups.length === 0 && (
          <EmptySectionNote message="You're not leading any groups" />
        )}
        {data?.createdGroups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            actions={[
              { label: 'Details', style: 'outline', onClick: () => handleDetails(g) },
              { label: 'Cancel Group', style: 'danger', onClick: () => handleCancel(g), loading: actionLoadingId === g.id },
            ]}
          />
        ))}

        {/* JOINED */}
        <SectionLabel label="JOINED" />
        {data?.joinedGroups.length === 0 && (
          <EmptySectionNote message="You haven't joined any groups" />
        )}
        {data?.joinedGroups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            actions={[
              { label: 'Details', style: 'outline', onClick: () => handleDetails(g) },
              { label: 'Leave', style: 'outline', onClick: () => handleLeave(g), loading: actionLoadingId === g.id },
            ]}
          />
        ))}
      </div>

      {selected && (
        <GroupDetailSheet
          group={selected}
          currentUserId={userId}
          onClose={() => setSelected(null)}
          onMutated={() => void mutate()}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/pages/MyGroupsPage.tsx
git commit -m "feat: update MyGroupsPage with LEADING/JOINED sections and inline actions"
```

---

## Task 10: Settings Copy Tweaks

**Files:**
- Modify: `miniapp/src/pages/SettingsPage.tsx`

Minimal changes — copy only.

- [ ] **Step 1: Update notification description and feedback label**

In `miniapp/src/pages/SettingsPage.tsx`, make these two changes:

Change:
```typescript
      description="Get notified when a new group is created"
```
to:
```typescript
      description="Notify me when groups open"
```

Change:
```typescript
      Send Feedback 📣
```
to:
```typescript
      Send Feedback
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/pages/SettingsPage.tsx
git commit -m "chore: update Settings copy — concise labels"
```

---

## Task 11: Tab Bar Active Color

**Files:**
- Modify: `miniapp/src/components/App.tsx`

The active tab should use `#22c55e` instead of whatever Telegram's default tint is.

- [ ] **Step 1: Add active color style to Tabbar.Item**

In `miniapp/src/components/App.tsx`, change:
```typescript
        <Tabbar.Item
          key={route.path}
          text={route.tabLabel}
          selected={location.pathname === route.path}
          onClick={() => handleSelect(route.path)}
        >
          <span style={{ fontSize: 20 }}>{route.tabIcon}</span>
        </Tabbar.Item>
```
to:
```typescript
        <Tabbar.Item
          key={route.path}
          text={route.tabLabel}
          selected={location.pathname === route.path}
          onClick={() => handleSelect(route.path)}
          style={location.pathname === route.path ? { color: '#22c55e' } : undefined}
        >
          <span style={{ fontSize: 20 }}>{route.tabIcon}</span>
        </Tabbar.Item>
```

- [ ] **Step 2: Verify build**

```bash
cd miniapp && bun run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/components/App.tsx
git commit -m "feat: set active tab color to green accent"
```

---

## Task 12: Page Background Color

**Files:**
- Modify: `miniapp/src/index.css`

- [ ] **Step 1: Update body background**

Replace the entire content of `miniapp/src/index.css` with:

```css
body {
  background: #f7faf8;
  padding: 0;
  margin: 0;
}
```

- [ ] **Step 2: Full build verify**

```bash
cd miniapp && bun run build 2>&1
```
Expected: clean build, zero TypeScript errors, zero warnings.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/index.css
git commit -m "chore: set page background to light green-tinted white"
```

---

## Task 13: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
cd miniapp && bun run dev
```
Expected: server starts on `http://localhost:5173` (or similar) with no console errors.

- [ ] **Step 2: Check Browse tab**
  - Cards render with icon box, title, meta, status badge
  - Open groups show Details + Join buttons
  - Full groups show no buttons and are at 55% opacity
  - Header shows "Browse" + group count subtitle

- [ ] **Step 3: Test inline Join**
  - Tap Join on an open group
  - Confirm 1-tap join — no sheet required
  - Group count should update after SWR refresh

- [ ] **Step 4: Test Details sheet**
  - Tap Details on a card
  - Sheet slides up with title, meta, member list, action button
  - Order link shows as "Open GrabFood link →" (outline button)

- [ ] **Step 5: Test Create stepper**
  - Navigate to Create tab
  - Step 1: enter title, Next
  - Step 2: enter/skip link, Next
  - Step 3: select chips (2/4/8/16/32), try No Limit, try Custom → enter a number
  - Step 4: select expiry chip, try Custom → pick a time ≥15 min from now
  - Step 4 button reads "Create Group ✓"
  - Submit → success

- [ ] **Step 6: Check My Groups tab**
  - LEADING section shows groups you created
  - JOINED section shows groups you joined
  - Empty section shows "You're not leading any groups" / "You haven't joined any groups"
  - Cancel Group button (red outline) on leading cards
  - Leave button (grey outline) on joined cards

- [ ] **Step 7: Final build**

```bash
cd miniapp && bun run build
```
Expected: zero TypeScript errors, successful Vite build output.
