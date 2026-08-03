import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import type { FoodGroupDetail } from '../types.ts';
import { formatExpiry, formatMemberName, formatCountdown } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup } from '../lib/api.ts';
import { copyInviteCode, shareInvite } from '../lib/share.ts';
import { theme } from '../lib/theme.ts';

interface GroupDetailPanelProps {
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

function statusPill(status: FoodGroupDetail['status']): { label: string; bg: string; color: string } {
  if (status === 'open')      return { label: 'Open', bg: theme.accentLight, color: theme.accent };
  if (status === 'full')      return { label: 'Full', bg: '#fff7e6', color: '#b45309' };
  if (status === 'cancelled') return { label: 'Cancelled', bg: theme.errorLight, color: theme.error };
  return { label: 'Expired', bg: theme.errorLight, color: theme.error };
}

export function GroupDetailPanel({ group, currentUserId, onClose, onMutated }: GroupDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
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

  function flashCopyFeedback(message: string) {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  async function handleCopyCode() {
    hapticFeedback.impactOccurred('light');
    try {
      await copyInviteCode(group.code);
      flashCopyFeedback('Code copied!');
    } catch {
      flashCopyFeedback('Could not copy');
    }
  }

  async function handleShare() {
    hapticFeedback.impactOccurred('light');
    try {
      const result = await shareInvite(group.code, group.title);
      if (result === 'copied') flashCopyFeedback('Link copied!');
    } catch {
      flashCopyFeedback('Could not share');
    }
  }

  const maxLabel = group.max_members === null ? '∞' : String(group.max_members);
  const platform = group.external_link ? platformLabel(group.external_link) : null;
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
      <div style={{
        background: theme.accentLight,
        border: `1.5px solid ${theme.accentBorder}`,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 14,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
          Share this code — anyone with it can find and join this group.
        </div>
        <div style={{
          fontSize: 30, fontWeight: 800, letterSpacing: 3,
          color: theme.textPrimary, fontFamily: 'monospace',
          marginBottom: 12, wordBreak: 'break-all',
        }}>
          {group.code}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => void handleCopyCode()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: theme.cardBg, color: theme.textPrimary,
              border: `1.5px solid ${theme.accentBorder}`,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📋 Copy code
          </button>
          <button
            onClick={() => void handleShare()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: theme.accent, color: '#fff',
              border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ↗ Share
          </button>
        </div>
        {copyFeedback && (
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, marginTop: 8 }}>
            {copyFeedback}
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>👤</span> Hosted by {formatMemberName(group.creator_first_name, group.creator_username)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>👥</span> {group.current_count}/{maxLabel} members
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textSecondary }}>
          <span>⏳</span> Closes {formatExpiry(group.expires_at)} ({formatCountdown(group.expires_at)})
        </div>
      </div>

      {/* Order link */}
      {group.external_link && (
        <a
          href={group.external_link}
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
          MEMBERS ({group.current_count}/{maxLabel})
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
          {group.members.map((m, i) => (
            <div key={m.user_id} style={{
              fontSize: 13, color: theme.textPrimary,
              padding: '8px 10px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: i % 2 === 0 ? theme.cardBg : theme.pageBg,
            }}>
              <span>{m.user_id === group.creator_id ? '👑' : '·'}</span>
              {formatMemberName(m.first_name, m.username)}
            </div>
          ))}
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
            onClick={() => { setConfirming(false); void handleAction(); }}
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
