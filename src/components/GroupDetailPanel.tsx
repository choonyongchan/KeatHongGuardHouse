import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { track } from '@vercel/analytics/react';
import type { FoodGroupDetail, GroupVisibility } from '../types.ts';
import { formatExpiry, formatMemberName, formatDurationLabel } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup, updateGroup } from '../lib/api.ts';
import { openUserChat } from '../lib/share.ts';
import { ShareCodeBlock } from './ShareCodeBlock.tsx';
import { theme } from '../lib/theme.ts';

const MEMBER_CAP_PRESETS = [2, 4, 8, 16, 32] as const;

function settingChipStyle(selected: boolean): CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 20,
    border: selected ? `2px solid ${theme.accent}` : `1.5px solid ${theme.border}`,
    background: selected ? theme.accentLight : 'transparent',
    color: selected ? theme.accent : theme.textSecondary,
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
  };
}

interface HostSettingsProps {
  group: FoodGroupDetail;
  onSaved: (patch: { maxMembers?: number | null; visibility?: GroupVisibility }) => void;
}

function HostSettings({ group, onSaved }: HostSettingsProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(patch: { maxMembers?: number | null; visibility?: GroupVisibility }, key: string) {
    hapticFeedback.impactOccurred('light');
    setSaving(key);
    setError(null);
    try {
      await updateGroup(group.code, patch);
      onSaved(patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update group');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        color: theme.textSecondary, marginBottom: 8,
      }}>
        GROUP SETTINGS
      </div>

      <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>Member cap</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {MEMBER_CAP_PRESETS.map((n) => (
          <button
            key={n}
            disabled={saving !== null}
            onClick={() => void apply({ maxMembers: n }, `cap-${n}`)}
            style={settingChipStyle(group.maxMembers === n)}
          >
            {saving === `cap-${n}` ? <Spinner size="s" /> : n}
          </button>
        ))}
        <button
          disabled={saving !== null}
          onClick={() => void apply({ maxMembers: null }, 'cap-null')}
          style={settingChipStyle(group.maxMembers === null)}
        >
          {saving === 'cap-null' ? <Spinner size="s" /> : 'No Limit'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>Who can find this group?</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          disabled={saving !== null}
          onClick={() => void apply({ visibility: 'public' }, 'vis-public')}
          style={settingChipStyle(group.visibility === 'public')}
        >
          {saving === 'vis-public' ? <Spinner size="s" /> : '🌐 Public'}
        </button>
        <button
          disabled={saving !== null}
          onClick={() => void apply({ visibility: 'private' }, 'vis-private')}
          style={settingChipStyle(group.visibility === 'private')}
        >
          {saving === 'vis-private' ? <Spinner size="s" /> : '🔒 Private'}
        </button>
      </div>

      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

interface GroupDetailPanelProps {
  group: FoodGroupDetail;
  currentUserId: number;
  onClose: () => void;
  onMutated: () => void;
}

function resolveAction(group: FoodGroupDetail, userId: number): 'join' | 'leave' | 'cancel' | null {
  const isMember = group.members.some((m) => m.userId === userId);
  const isCreator = group.creatorId === userId;
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

function statusPill(status: FoodGroupDetail['status']): { label: string; bg: string; color: string } {
  if (status === 'open')      return { label: 'Open', bg: theme.accentLight, color: theme.accent };
  if (status === 'full')      return { label: 'Full', bg: theme.warningBg, color: theme.warningText };
  if (status === 'cancelled') return { label: 'Cancelled', bg: theme.errorLight, color: theme.error };
  return { label: 'Expired', bg: theme.errorLight, color: theme.error };
}

export function GroupDetailPanel({ group: groupProp, currentUserId, onClose, onMutated }: GroupDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [overrides, setOverrides] = useState<{ maxMembers?: number | null; visibility?: GroupVisibility }>({});
  const group = { ...groupProp, ...overrides };
  const action = resolveAction(group, currentUserId);
  const isCreator = group.creatorId === currentUserId;
  const isActive = group.status === 'open' || group.status === 'full';

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

  function handleSettingsSaved(patch: { maxMembers?: number | null; visibility?: GroupVisibility }) {
    setOverrides((o) => ({
      ...o,
      ...(patch.maxMembers !== undefined ? { maxMembers: patch.maxMembers } : {}),
      ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
    }));
    onMutated();
  }

  const maxLabel = group.maxMembers === null ? '∞' : String(group.maxMembers);
  const countLabel = group.maxMembers === null
    ? `${group.currentCount} pax`
    : `${group.currentCount}/${maxLabel} pax`;
  const platform = group.externalLink ? platformLabel(group.externalLink) : null;
  const pill = statusPill(group.status);

  const actionLabel = action === 'join' ? 'Join Group' : action === 'leave' ? 'Leave' : 'Cancel';
  const actionBg = action === 'join' ? theme.accent : 'transparent';
  const actionColor = action === 'join' ? '#fff' : action === 'cancel' ? theme.error : theme.textSecondary;
  const actionBorder = action === 'join' ? 'none' : `1.5px solid ${action === 'cancel' ? theme.error : theme.border}`;

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: 14,
        marginBottom: 8,
        padding: '14px 14px 16px',
        boxShadow: theme.shadow,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: theme.textPrimary,
            marginBottom: 6, wordBreak: 'break-word',
          }}>
            {group.title}
          </div>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
            padding: '3px 8px', borderRadius: 999, background: pill.bg, color: pill.color,
          }}>
            {pill.label.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse details"
          style={{
            flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.pageBg, border: `1px solid ${theme.border}`, borderRadius: 8,
            color: theme.textSecondary, fontSize: 13, cursor: 'pointer',
          }}
        >
          ▲
        </button>
      </div>

      {/* Invite section */}
      <ShareCodeBlock
        code={group.code}
        title={group.title}
        caption="Share this code — anyone with it can find and join this group."
        marginBottom={14}
        codeFontSize={30}
      />

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>👑</span> {formatMemberName(group.creatorFirstName, group.creatorUsername)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>👥</span> {countLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>⏳</span> {formatExpiry(group.expiresAt)} - {formatDurationLabel(group.expiresAt)}
        </div>
      </div>

      {/* Host settings */}
      {isCreator && isActive && <HostSettings group={group} onSaved={handleSettingsSaved} />}

      {/* Order link */}
      {group.externalLink && (
        <a
          href={group.externalLink}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            marginBottom: 14,
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
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: theme.textSecondary, marginBottom: 8,
        }}>
          MEMBERS ({countLabel})
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
          {group.members.map((m, i) => {
            const clickable = m.userId !== currentUserId && !!m.username;
            return (
              <div
                key={m.userId}
                onClick={clickable ? () => {
                  hapticFeedback.impactOccurred('light');
                  track('Message Member', { code: group.code });
                  openUserChat(m.username!);
                } : undefined}
                role={clickable ? 'button' : undefined}
                aria-label={clickable ? `Message ${formatMemberName(m.firstName, m.username)} on Telegram` : undefined}
                style={{
                  fontSize: 13, color: theme.textPrimary,
                  padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: i % 2 === 0 ? theme.cardBg : theme.pageBg,
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                <span>{m.userId === group.creatorId ? '👑' : '·'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{formatMemberName(m.firstName, m.username)}</span>
                {m.userId !== currentUserId && (
                  m.username ? (
                    <span style={{ flexShrink: 0, fontSize: 13 }}>💬</span>
                  ) : (
                    <span
                      aria-label="No Telegram username set"
                      style={{ flexShrink: 0, fontSize: 10, color: theme.textSecondary, opacity: 0.6 }}
                    >
                      no username
                    </span>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: theme.error, fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Action button / inline confirm */}
      {action && !confirming && (
        <button
          onClick={() => (action === 'cancel' ? setConfirming(true) : void handleAction())}
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

      {action === 'cancel' && confirming && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setConfirming(false); track('Cancel Group', { code: group.code }); void handleAction(); }}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'transparent', color: theme.error,
              border: `1.5px solid ${theme.error}`,
              fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Spinner size="s" /> : 'Confirm Cancel'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'transparent', color: theme.textSecondary,
              border: `1.5px solid ${theme.border}`,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
