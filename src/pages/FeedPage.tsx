/**
 * @fileoverview FeedPage — the main screen. All/Mine segment, category chips,
 * group list with inline detail panel. Also opens `startapp` deep-link groups.
 */

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';
import { useSignal, useLaunchParams, initData } from '@tma.js/sdk-react';
import { useNavigate } from 'react-router-dom';

import { CATEGORIES, type Category, type Group, type GroupDetail } from '../../shared/rules.ts';
import { getGroup, getGroups, groupAction } from '../lib/api.ts';
import { useRun } from '../lib/useRun.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailPanel } from '../components/GroupDetailPanel.tsx';
import { buttonStyle, chipStyle, theme } from '../lib/theme.ts';

// Module-level so the deep link opens once per launch, not on every tab switch back.
let deepLinkHandled = false;

export function FeedPage() {
  const startParam = useLaunchParams().tgWebAppStartParam ?? '';
  const [mine, setMine] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<GroupDetail | null>(null);
  const { data: groups, error, mutate } = useSWR<Group[], Error>(['groups', mine], () => getGroups(mine), {
    refreshInterval: 30_000,
  });
  const userId = useSignal(initData.user)?.id ?? 0;
  const navigate = useNavigate();
  const { run, busy } = useRun();

  async function open(code: string) {
    if (selected?.code === code) return setSelected(null);
    const detail = await run(`open-${code}`, () => getGroup(code));
    if (detail) setSelected(detail);
  }

  async function join(g: Group) {
    const detail = await run(`join-${g.code}`, () => groupAction(g.code, 'join'), 'join group');
    if (detail) {
      setSelected(detail); // shows the leader card right away
      void mutate();
    }
  }

  // Deep-link entry: ?startapp=CODE (letters + optional digits, not "debug") opens that group.
  useEffect(() => {
    if (deepLinkHandled) return;
    deepLinkHandled = true;
    if (startParam !== 'debug' && /^[A-Za-z]+\d*$/.test(startParam)) void open(startParam.toUpperCase());
  }, []);

  const shown = groups?.filter((g) => !category || g.category === category) ?? [];
  const selectedInList = !!selected && shown.some((g) => g.code === selected.code);

  const panel = selected && (
    <GroupDetailPanel
      key={selected.code}
      group={selected}
      currentUserId={userId}
      onClose={() => setSelected(null)}
      onChanged={() => void mutate()}
    />
  );

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      {/* All / Mine */}
      <div style={{ display: 'flex', gap: 4, padding: 3, background: theme.badgeBg, borderRadius: 10, marginBottom: 12 }}>
        {[false, true].map((m) => (
          <button
            key={String(m)}
            onClick={() => setMine(m)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: mine === m ? theme.cardBg : 'transparent',
              color: mine === m ? theme.textPrimary : theme.textSecondary,
            }}
          >
            {m ? 'My groups' : 'All groups'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        <button onClick={() => setCategory(null)} style={chipStyle(category === null)}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={chipStyle(category === c.id)}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {selected && !selectedInList && panel}

      {!groups && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><Spinner size="m" /></div>
      )}

      {error && (
        <p style={{ color: theme.error, textAlign: 'center', marginTop: 32, fontSize: 13 }}>Failed to load groups.</p>
      )}

      {groups && shown.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 6 }}>
            {mine ? "You're not in any groups yet" : 'No open groups here'}
          </div>
          <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 14 }}>
            Start one — it takes 10 seconds.
          </div>
          <button onClick={() => void navigate('/create')} style={{ ...buttonStyle('primary'), width: 'auto', padding: '10px 24px' }}>
            Create a group
          </button>
        </div>
      )}

      {shown.map((g) => (
        <div key={g.id}>
          <GroupCard
            group={g}
            onOpen={() => void open(g.code)}
            onJoin={!g.joined && g.status === 'open' ? () => void join(g) : undefined}
            joining={busy === `join-${g.code}`}
          />
          {selected?.code === g.code && panel}
        </div>
      ))}
    </div>
  );
}
