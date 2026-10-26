/**
 * @fileoverview SettingsPage — how-it-works, then the notification switch + categories.
 */

import type { ReactNode } from 'react';
import useSWR from 'swr';
import { Spinner, Switch } from '@telegram-apps/telegram-ui';

import { CATEGORIES, type Category, type UserProfile } from '../../shared/rules.ts';
import { getMe, updateMe } from '../lib/api.ts';
import { useRun } from '../lib/useRun.ts';
import {
  cardStyle, chipStyle, headerStyle, pageStyle, sectionLabelStyle, subtitleStyle, theme, titleStyle,
} from '../lib/theme.ts';

const STEPS = [
  ['➕', 'Create', 'Pick a category, name it, tap Create. You become the group leader.'],
  ['↗', 'Share', 'Send the link to any chat. Subscribers of that category get a DM too.'],
  ['👑', 'Coordinate', 'When someone joins, the bot DMs them a button to message the leader, and tells the leader who joined.'],
] as const;

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 24, padding: 16 }}>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data, mutate } = useSWR<UserProfile>('/api/users/me', getMe);
  const { run, busy } = useRun();

  async function save(key: string, patch: Parameters<typeof updateMe>[0]) {
    const updated = await run(key, () => updateMe(patch));
    if (updated) void mutate(updated, false);
  }

  function toggle(id: Category) {
    if (!data) return;
    const next = data.subscriptions.includes(id)
      ? data.subscriptions.filter((c) => c !== id)
      : [...data.subscriptions, id];
    void save(id, { subscriptions: next });
  }

  return (
    <div style={pageStyle()}>
      {/* ── Information ── */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>Settings</h1>
        <p style={subtitleStyle}>Choose which new groups the bot tells you about.</p>
      </header>

      <div style={sectionLabelStyle}>How it works</div>
      <Card>
        {STEPS.map(([emoji, title, text], i) => (
          <div key={title} style={{ display: 'flex', gap: 12, marginTop: i ? 16 : 0 }}>
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary }}>{title}</div>
              <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.43 }}>{text}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* ── Controls ── */}
      <div style={sectionLabelStyle}>Notifications</div>
      <Card>
        {!data ? <Spinner size="s" /> : (<>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, cursor: 'pointer' }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 17, color: theme.textPrimary }}>New group alerts</span>
              <span style={{ display: 'block', fontSize: 14, color: theme.textSecondary }}>
                {data.notify ? 'The bot DMs you when a public group opens' : 'Off — you get no new-group DMs'}
              </span>
            </span>
            {busy === 'notify' ? <Spinner size="s" /> : (
              <Switch
                checked={data.notify}
                disabled={busy !== null}
                onChange={(e) => void save('notify', { notify: e.target.checked })}
                aria-label="New group alerts"
              />
            )}
          </label>
          {data.notify && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} disabled={busy !== null} onClick={() => void toggle(c.id)} style={chipStyle(data.subscriptions.includes(c.id))}>
                {busy === c.id ? <Spinner size="s" /> : `${c.emoji} ${c.label}`}
              </button>
            ))}
          </div>
          )}
        </>)}
      </Card>

      <div style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center' }}>
        KeatHong GuardHouse · Connecting neighbours one group at a time
      </div>
    </div>
  );
}
