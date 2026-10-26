/**
 * @fileoverview SettingsPage — notification categories + how-it-works.
 */

import type { ReactNode } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';

import { CATEGORIES, type Category, type UserProfile } from '../../shared/rules.ts';
import { getMe, setSubscriptions } from '../lib/api.ts';
import { useRun } from '../lib/useRun.ts';
import { chipStyle, sectionLabelStyle, theme } from '../lib/theme.ts';

const STEPS = [
  ['➕', 'Create', 'Pick a category, name it, tap Create. You become the group leader.'],
  ['↗', 'Share', 'Send the link to any chat. Subscribers of that category get a DM too.'],
  ['👑', 'Coordinate', 'When someone joins, the bot DMs them a button to message the leader, and tells the leader who joined.'],
] as const;

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: theme.cardBg, borderRadius: 14, boxShadow: theme.shadow, marginBottom: 20, padding: '14px 16px' }}>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data, mutate } = useSWR<UserProfile>('/api/users/me', getMe);
  const { run, busy } = useRun();

  async function toggle(id: Category) {
    if (!data) return;
    const next = data.subscriptions.includes(id)
      ? data.subscriptions.filter((c) => c !== id)
      : [...data.subscriptions, id];
    const updated = await run(id, () => setSubscriptions(next));
    if (updated) void mutate(updated, false);
  }

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary, marginBottom: 16 }}>Settings</div>

      <div style={sectionLabelStyle}>NOTIFY ME ABOUT NEW…</div>
      <Card>
        {!data ? <Spinner size="s" /> : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} disabled={busy !== null} onClick={() => void toggle(c.id)} style={chipStyle(data.subscriptions.includes(c.id))}>
                {busy === c.id ? <Spinner size="s" /> : `${c.emoji} ${c.label}`}
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 10 }}>
          The bot DMs you when a public group opens in a category you pick.
        </div>
      </Card>

      <div style={sectionLabelStyle}>HOW IT WORKS</div>
      <Card>
        {STEPS.map(([emoji, title, text]) => (
          <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>{title}</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.5 }}>{text}</div>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center' }}>
        KeatHong GuardHouse · Connecting neighbours one group at a time
      </div>
    </div>
  );
}
