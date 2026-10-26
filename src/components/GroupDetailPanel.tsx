import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { MEMBER_PRESETS, categoryOf, isActive, type GroupDetail } from '../../shared/rules.ts';
import { formatExpiry, formatTimeLeft, memberName, platformLabel } from '../../shared/format.ts';
import { groupAction, updateGroup, type GroupAction } from '../lib/api.ts';
import { openUserChat } from '../lib/share.ts';
import { useRun } from '../lib/useRun.ts';
import { ShareCodeBlock } from './ShareCodeBlock.tsx';
import { buttonStyle, chipStyle, sectionLabelStyle, statusBadge, theme } from '../lib/theme.ts';

interface GroupDetailPanelProps {
  group: GroupDetail;
  currentUserId: number;
  onClose: () => void;
  /** Called after any successful change, so lists can revalidate. */
  onChanged: () => void;
}

function primaryAction(g: GroupDetail, userId: number): GroupAction | null {
  if (!isActive(g.status)) return null;
  if (g.creatorId === userId) return 'cancel';
  if (g.joined) return 'leave';
  return g.status === 'open' ? 'join' : null;
}

const ACTION_LABEL: Record<GroupAction, string> = { join: 'Join group', leave: 'Leave', cancel: 'Cancel group' };

export function GroupDetailPanel({ group: initial, currentUserId, onClose, onChanged }: GroupDetailPanelProps) {
  const [group, setGroup] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const { run, busy } = useRun();

  const isLeader = group.creatorId === currentUserId;
  const active = isActive(group.status);
  const action = primaryAction(group, currentUserId);
  const badge = statusBadge(group.status);
  const leaderName = memberName(group.creatorFirstName, group.creatorUsername);
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

  return (
    <div style={{ background: theme.cardBg, borderRadius: 14, marginBottom: 8, padding: '14px 14px 16px', boxShadow: theme.shadow }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 6, wordBreak: 'break-word' }}>
            {categoryOf(group.category).emoji} {group.title}
          </div>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
            padding: '3px 8px', borderRadius: 999, background: badge.bg, color: badge.color,
          }}>
            {badge.label}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse details"
          style={{
            width: 28, height: 28, background: theme.pageBg, border: `1px solid ${theme.border}`,
            borderRadius: 8, color: theme.textSecondary, fontSize: 13, cursor: 'pointer',
          }}
        >
          ▲
        </button>
      </div>

      {/* Leader: the person everyone coordinates with */}
      {!isLeader && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px',
          border: `1.5px solid ${theme.accentBorder}`, background: theme.accentLight, borderRadius: 10,
        }}>
          <span style={{ fontSize: 20 }}>👑</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>{leaderName}</div>
            <div style={{ fontSize: 11, color: theme.textSecondary }}>Group leader — message them to coordinate</div>
          </div>
          {group.creatorUsername ? (
            <button
              onClick={() => openUserChat(group.creatorUsername!)}
              style={{ ...buttonStyle('primary'), width: 'auto', padding: '8px 12px', fontSize: 12 }}
            >
              💬 Message
            </button>
          ) : (
            <span style={{ fontSize: 10, color: theme.textMuted }}>no username</span>
          )}
        </div>
      )}

      <ShareCodeBlock code={group.code} title={group.title} marginBottom={14} />

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 12, color: theme.textSecondary }}>
        <div>👥 {countLabel} joined</div>
        <div>⏳ Closes {formatExpiry(group.expiresAt)} ({formatTimeLeft(group.expiresAt)})</div>
      </div>

      {group.externalLink && (
        <a
          href={group.externalLink}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block', marginBottom: 14, padding: '10px 14px', border: `1.5px solid ${theme.border}`,
            borderRadius: 10, color: theme.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Open {platformLabel(group.externalLink)} →
        </a>
      )}

      {/* Leader settings */}
      {isLeader && active && (
        <div style={{ marginBottom: 14 }}>
          <div style={sectionLabelStyle}>GROUP SETTINGS</div>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>Member cap</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
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
          <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>Who can find this group?</div>
          <div style={{ display: 'flex', gap: 6 }}>
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

      {/* Members */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabelStyle}>MEMBERS ({countLabel})</div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
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
                  fontSize: 13, color: theme.textPrimary, padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: i % 2 === 0 ? theme.cardBg : theme.pageBg,
                  cursor: canMessage ? 'pointer' : 'default',
                }}
              >
                <span>{m.userId === group.creatorId ? '👑' : '·'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{name}{m.userId === currentUserId && ' (you)'}</span>
                {canMessage && <span>💬</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary action, with inline confirm for cancel */}
      {action && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAction}
            disabled={busy !== null}
            style={buttonStyle(action === 'join' ? 'primary' : action === 'cancel' ? 'danger' : 'outline', busy !== null)}
          >
            {busy === 'action' ? <Spinner size="s" /> : confirming ? 'Confirm cancel' : ACTION_LABEL[action]}
          </button>
          {confirming && (
            <button onClick={() => setConfirming(false)} style={buttonStyle('outline')}>Keep it</button>
          )}
        </div>
      )}
    </div>
  );
}
