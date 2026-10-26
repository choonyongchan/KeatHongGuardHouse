/**
 * @fileoverview CreatePage — one-screen group creation. Picking a category
 * sets a sensible expiry; after creating, shows the group's detail panel
 * (which has the share buttons).
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { useSignal, initData } from '@tma.js/sdk-react';

import {
  CATEGORIES, EXPIRY_PRESETS, MEMBER_PRESETS, TITLE_MAX, validateLink, validateTitle,
  type Category, type GroupDetail,
} from '../../shared/rules.ts';
import { createGroup } from '../lib/api.ts';
import { useRun } from '../lib/useRun.ts';
import { GroupDetailPanel } from '../components/GroupDetailPanel.tsx';
import { buttonStyle, chipStyle, theme } from '../lib/theme.ts';

const PLACEHOLDERS: Record<Category, string> = {
  food: 'e.g. Supper at Al-Ameen',
  grab: 'e.g. Grab to Choa Chu Kang MRT',
  gaming: 'e.g. Valorant 5-stack tonight',
  other: 'e.g. Badminton at the CC',
};

const inputStyle = (hasError: boolean): CSSProperties => ({
  width: '100%', border: `1.5px solid ${hasError ? theme.error : theme.border}`, borderRadius: 10,
  padding: '10px 12px', fontSize: 14, color: theme.textPrimary, background: theme.cardBg,
  outline: 'none', boxSizing: 'border-box',
});

const labelStyle: CSSProperties = { fontSize: 13, color: theme.textSecondary, margin: '18px 0 8px' };

const rowStyle: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };

export function CreatePage() {
  const [category, setCategory] = useState<Category>('food');
  const [title, setTitle] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [maxMembers, setMaxMembers] = useState<number | null>(null);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(CATEGORIES[0].defaultExpiry);
  const [errors, setErrors] = useState<{ title?: string | null; link?: string | null }>({});
  const [created, setCreated] = useState<GroupDetail | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;
  const { run, busy } = useRun();

  function pickCategory(id: Category) {
    setCategory(id);
    setExpiryMinutes(CATEGORIES.find((c) => c.id === id)!.defaultExpiry);
  }

  async function submit() {
    const next = { title: validateTitle(title), link: validateLink(externalLink) };
    setErrors(next);
    if (next.title || next.link) return;
    const group = await run(
      'create',
      () => createGroup({ title: title.trim(), category, externalLink: externalLink.trim(), maxMembers, expiryMinutes }),
      'create group',
    );
    if (group) setCreated(group);
  }

  function reset() {
    setCreated(null);
    setTitle('');
    setExternalLink('');
  }

  if (created) {
    return (
      <div style={{ padding: '16px 16px 80px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>Group created 🎉</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: theme.textSecondary }}>
          You're the leader. Share the link — the bot will DM you when people join.
        </p>
        <GroupDetailPanel group={created} currentUserId={userId} onClose={reset} onChanged={() => {}} />
        <button onClick={reset} style={{ ...buttonStyle('outline'), marginTop: 8 }}>Create another</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>Start a group</h2>

      <div style={labelStyle}>What for?</div>
      <div style={rowStyle}>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => pickCategory(c.id)} style={chipStyle(category === c.id)}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={labelStyle}>Name</div>
      <input
        placeholder={PLACEHOLDERS[category]}
        value={title}
        onChange={(e) => { setTitle(e.target.value); setErrors({}); }}
        maxLength={TITLE_MAX}
        autoComplete="off"
        style={inputStyle(!!errors.title)}
        aria-label="Group name"
      />
      {errors.title && <p style={{ color: theme.error, fontSize: 11, margin: '4px 0 0' }}>{errors.title}</p>}

      <div style={labelStyle}>How many people (including you)?</div>
      <div style={rowStyle}>
        {MEMBER_PRESETS.map((n) => (
          <button key={String(n)} onClick={() => setMaxMembers(n)} style={chipStyle(maxMembers === n)}>
            {n ?? 'No limit'}
          </button>
        ))}
      </div>

      <div style={labelStyle}>Closes in</div>
      <div style={rowStyle}>
        {EXPIRY_PRESETS.map(({ label, value }) => (
          <button key={value} onClick={() => setExpiryMinutes(value)} style={chipStyle(expiryMinutes === value)}>
            {label}
          </button>
        ))}
      </div>

      <div style={labelStyle}>Link (optional) — Grab cart, game lobby, chat invite…</div>
      <input
        placeholder="https://…"
        value={externalLink}
        onChange={(e) => { setExternalLink(e.target.value); setErrors({}); }}
        inputMode="url"
        autoComplete="off"
        style={inputStyle(!!errors.link)}
        aria-label="Link"
      />
      {errors.link && <p style={{ color: theme.error, fontSize: 11, margin: '4px 0 0' }}>{errors.link}</p>}

      <button
        onClick={() => void submit()}
        disabled={busy !== null}
        style={{ ...buttonStyle('primary', busy !== null), marginTop: 24 }}
      >
        {busy ? <Spinner size="s" /> : 'Create group'}
      </button>
    </div>
  );
}
