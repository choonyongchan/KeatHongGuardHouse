/**
 * @fileoverview FeedPage — the main screen. Large title on top, group list in the
 * middle, All/Mine + category filters pinned at the bottom (One UI). Tapping a group
 * opens its details in a bottom sheet. Also opens `startapp` deep-link groups.
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
import {
  bottomBarStyle, buttonStyle, chipStyle, gridStyle, headerStyle, pageStyle, subtitleStyle, theme, titleStyle,
} from '../lib/theme.ts';

// Module-level so the deep link opens once per launch, not on every tab switch back.
let deepLinkHandled = false;

/** Height of the filter bar (segment + chips + padding), reserved under the list. */
const FILTER_BAR_H = 120;

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
  const openCount = shown.filter((g) => g.status === 'open').length;

  return (
    <div style={pageStyle(FILTER_BAR_H)}>
      {/* ── Information ── */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>{mine ? 'My groups' : 'Groups'}</h1>
        <p style={subtitleStyle}>
          {!groups ? 'Loading…' : openCount ? `${openCount} open now` : 'Nothing open right now'}
        </p>
      </header>

      {!groups && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><Spinner size="m" /></div>
      )}

      {error && (
        <p style={{ color: theme.error, textAlign: 'center', marginTop: 32, fontSize: 14 }}>Failed to load groups.</p>
      )}

      {groups && shown.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <div style={{ fontSize: 21, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>
            {mine ? "You're not in any groups yet" : 'No open groups here'}
          </div>
          <div style={{ fontSize: 17, color: theme.textSecondary, marginBottom: 20 }}>
            Start one — it takes 10 seconds.
          </div>
          <button onClick={() => void navigate('/create')} style={{ ...buttonStyle('primary'), width: 'auto' }}>
            Create a group
          </button>
        </div>
      )}

      <div style={gridStyle}>
      {shown.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          onOpen={() => void open(g.code)}
          onJoin={!g.joined && g.status === 'open' ? () => void join(g) : undefined}
          joining={busy === `join-${g.code}`}
        />
      ))}
      </div>

      {/* ── Controls ── */}
      <div style={bottomBarStyle}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
          <button onClick={() => setCategory(null)} style={chipStyle(category === null)}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={chipStyle(category === c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', padding: 2, background: theme.badgeBg, borderRadius: 9999 }}>
          {[false, true].map((m) => (
            <button
              key={String(m)}
              onClick={() => setMine(m)}
              style={{
                flex: 1, minHeight: 36, borderRadius: 9999, border: 'none', fontSize: 14, cursor: 'pointer',
                fontWeight: mine === m ? 600 : 400,
                background: mine === m ? theme.cardBg : 'transparent',
                color: mine === m ? theme.textPrimary : theme.textSecondary,
              }}
            >
              {m ? 'My groups' : 'All groups'}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={selected.title}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 'var(--app-max-w)', margin: '0 auto',
              maxHeight: '88dvh', overflowY: 'auto', overscrollBehavior: 'contain',
              background: theme.pageBg, borderRadius: '18px 18px 0 0',
              padding: '8px 16px env(safe-area-inset-bottom)',
            }}
          >
            <div
              onClick={() => setSelected(null)}
              aria-hidden
              style={{ width: 36, height: 5, borderRadius: 9999, background: theme.badgeBg, margin: '0 auto 8px' }}
            />
            <GroupDetailPanel
              key={selected.code}
              group={selected}
              currentUserId={userId}
              onChanged={() => void mutate()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
