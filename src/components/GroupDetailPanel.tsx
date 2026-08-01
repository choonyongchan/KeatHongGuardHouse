import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import type { FoodGroupDetail } from '../types.ts';
import { formatExpiry, formatMemberName, formatCountdown } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup } from '../lib/api.ts';
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

export function GroupDetailPanel({ group, currentUserId, onClose, onMutated }: GroupDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
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
    <div
      style={{
        background: theme.cardBg,
        borderRadius: 14,
        marginBottom: 8,
        padding: '10px 12px 14px',
        boxShadow: theme.shadow,
      }}
    >
      {/* Collapse control */}
      <button
        onClick={onClose}
        aria-label="Collapse details"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', padding: 0, marginBottom: 10,
          fontSize: 11, fontWeight: 700, color: theme.textSecondary, cursor: 'pointer',
        }}
      >
        ▲ {group.code}
      </button>

      {/* Meta */}
      <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 14, lineHeight: 1.6 }}>
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
        <div>
          <p style={{ fontSize: 13, color: theme.textPrimary, marginBottom: 12 }}>
            Cancel "{group.title}"? This can't be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
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
              {loading ? <Spinner size="s" /> : 'Yes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
