import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { track } from '@vercel/analytics/react';
import { MEMBER_PRESETS, categoryOf, isActive, type GroupDetail } from '../../shared/rules.ts';
import { formatExpiry, formatTimeLeft, memberName, splitLinks } from '../../shared/format.ts';
import { groupAction, updateGroup, type GroupAction } from '../lib/api.ts';
import { openUserChat, shareInvite } from '../lib/share.ts';
import { useRun } from '../lib/useRun.ts';
import { buttonStyle, cardStyle, chipStyle, sectionLabelStyle, statusBadge, theme } from '../lib/theme.ts';

interface GroupDetailPanelProps {
  group: GroupDetail;
  currentUserId: number;
  /** Called after any successful change, so lists can revalidate. */
  onChanged: () => void;
  /** Where the sticky action bar rests: 0 inside a sheet, above the tab bar on a page. */
  footerBottom?: string;
}

function primaryAction(g: GroupDetail, userId: number): GroupAction | null {
  if (!isActive(g.status)) return null;
  if (g.creatorId === userId) return 'cancel';
  if (g.joined) return 'leave';
  return g.status === 'open' ? 'join' : null;
}

const ACTION_LABEL: Record<GroupAction, string> = { join: 'Join group', leave: 'Leave', cancel: 'Cancel group' };

const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' } as const;

/**
 * Group details, laid out One UI style: information on top (title, status, leader,
 * members), controls at the bottom (leader settings, then a sticky share/action bar).
 */
export function GroupDetailPanel({ group: initial, currentUserId, onChanged, footerBottom = '0px' }: GroupDetailPanelProps) {
  const [group, setGroup] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const { run, busy } = useRun();

  const isLeader = group.creatorId === currentUserId;
  const active = isActive(group.status);
  const action = primaryAction(group, currentUserId);
  const badge = statusBadge(group.status);
  const countLabel = group.maxMembers === null ? `${group.currentCount}` : `${group.currentCount}/${group.maxMembers}`;

  async function apply(key: string, fn: () => Promise<GroupDetail>, event?: string) {
    const updated = await run(key, fn, event);
    if (updated) {
      setGroup(updated);
      onChanged();
    }
  }

  function handleAction() {
    if (!action) return;
    if (action === 'cancel' && !confirming) return setConfirming(true);
    setConfirming(false);
    void apply('action', () => groupAction(group.code, action), `${action} group`);
  }

  function showFlash(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(null), 2000);
  }

  async function copyCode() {
    hapticFeedback.impactOccurred('light');
    track('Copy Group Code', { code: group.code });
    try {
      await navigator.clipboard.writeText(group.code);
      showFlash('Code copied');
    } catch {
      showFlash('Could not copy');
    }
  }

  async function share() {
    hapticFeedback.impactOccurred('light');
    track('Share Group Link', { code: group.code });
    try {
      if (await shareInvite(group.code, group.title)) showFlash('Link copied');
    } catch {
      showFlash('Could not share');
    }
  }

  const primary = action && (
    <button
      onClick={handleAction}
      disabled={busy !== null}
      style={buttonStyle(action === 'join' ? 'primary' : action === 'cancel' ? 'danger' : 'outline', busy !== null)}
    >
      {busy === 'action' ? <Spinner size="s" /> : confirming ? 'Confirm cancel' : ACTION_LABEL[action]}
    </button>
  );

  return (
    <div>
      {/* ── Information ── */}
      <div style={{ padding: '8px 4px 24px' }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>{categoryOf(group.category).emoji}</div>
        <h2 style={{
          margin: '0 0 8px', fontSize: 28, fontWeight: 600, lineHeight: 1.14, letterSpacing: -0.28,
          color: theme.textPrimary, wordBreak: 'break-word',
        }}>
          {group.title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14, color: theme.textSecondary }}>
          <span style={{ padding: '2px 10px', borderRadius: 9999, background: badge.bg, color: badge.color, fontWeight: 600 }}>
            {badge.label}
          </span>
          <span>{countLabel} joined</span>
          {active && <span>· {formatTimeLeft(group.expiresAt)} left</span>}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'hidden' }}>
        <div style={rowStyle}>
          <span style={{ fontSize: 20 }}>👑</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary }}>
              {memberName(group.creatorFirstName, group.creatorUsername)}{isLeader && ' (you)'}
            </div>
            <div style={{ fontSize: 14, color: theme.textSecondary }}>
              {isLeader ? "You're the leader" : 'Leader — message them to coordinate'}
            </div>
          </div>
          {!isLeader && group.creatorUsername && (
            <button
              onClick={() => openUserChat(group.creatorUsername!)}
              style={{ ...buttonStyle('primary'), width: 'auto', minHeight: 36, padding: '6px 16px', fontSize: 14 }}
            >
              Message
            </button>
          )}
        </div>
        <div style={{ ...rowStyle, borderTop: `1px solid ${theme.border}`, fontSize: 14, color: theme.textSecondary }}>
          <span style={{ flex: 1 }}>Closes {formatExpiry(group.expiresAt)}</span>
          <button
            onClick={() => void copyCode()}
            aria-label="Copy group code"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 600, letterSpacing: 1, color: theme.accent,
            }}
          >
            {group.code}
          </button>
        </div>
        {group.description && (
          <p style={{
            margin: 0, padding: '12px 16px', borderTop: `1px solid ${theme.border}`, fontSize: 15, color: theme.textPrimary,
            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          }}>
            {splitLinks(group.description).map((part, i) => part.href
              ? <a key={i} href={part.href} target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700 }}>{part.text}</a>
              : part.text)}
          </p>
        )}
      </div>

      <div style={sectionLabelStyle}>Members ({countLabel})</div>
      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'hidden' }}>
        {group.members.map((m, i) => {
          const name = memberName(m.firstName, m.username);
          const canMessage = m.userId !== currentUserId && !!m.username;
          return (
            <div
              key={m.userId}
              onClick={canMessage ? () => openUserChat(m.username!) : undefined}
              role={canMessage ? 'button' : undefined}
              aria-label={canMessage ? `Message ${name} on Telegram` : undefined}
              style={{
                ...rowStyle, fontSize: 17, color: theme.textPrimary,
                borderTop: i ? `1px solid ${theme.border}` : 'none', cursor: canMessage ? 'pointer' : 'default',
              }}
            >
              <span style={{ width: 20, textAlign: 'center' }}>{m.userId === group.creatorId ? '👑' : '·'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{name}{m.userId === currentUserId && ' (you)'}</span>
              {canMessage && <span style={{ color: theme.accent, fontSize: 14 }}>Message ›</span>}
            </div>
          );
        })}
      </div>

      {/* ── Controls ── */}
      {isLeader && active && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabelStyle}>Member cap</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {MEMBER_PRESETS.map((n) => (
              <button
                key={String(n)}
                disabled={busy !== null}
                onClick={() => void apply(`cap-${n}`, () => updateGroup(group.code, { maxMembers: n }))}
                style={chipStyle(group.maxMembers === n)}
              >
                {busy === `cap-${n}` ? <Spinner size="s" /> : n ?? 'No limit'}
              </button>
            ))}
          </div>
          <div style={sectionLabelStyle}>Who can find this group?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['public', 'private'] as const).map((v) => (
              <button
                key={v}
                disabled={busy !== null}
                onClick={() => void apply(`vis-${v}`, () => updateGroup(group.code, { visibility: v }))}
                style={chipStyle(group.visibility === v)}
              >
                {busy === `vis-${v}` ? <Spinner size="s" /> : v === 'public' ? '🌐 Public' : '🔒 Link only'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        position: 'sticky', bottom: footerBottom, padding: '12px 0 16px',
        background: theme.pageBg, borderTop: `1px solid ${theme.border}`,
      }}>
        {flash && <div style={{ textAlign: 'center', fontSize: 14, color: theme.accent, marginBottom: 8 }}>{flash}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          {confirming ? (
            <button onClick={() => setConfirming(false)} style={buttonStyle('outline')}>Keep it</button>
          ) : (
            <button onClick={() => void share()} style={buttonStyle(action === 'join' ? 'outline' : 'primary')}>Share</button>
          )}
          {primary}
        </div>
      </div>
    </div>
  );
}
