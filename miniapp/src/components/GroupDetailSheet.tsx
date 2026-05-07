// miniapp/src/components/GroupDetailSheet.tsx
import { useState } from 'react';
import { Modal, Spinner } from '@telegram-apps/telegram-ui';
import type { FoodGroupDetail } from '../types.ts';
import { formatExpiry, formatMemberName, formatCountdown } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup } from '../lib/api.ts';
import { theme } from '../lib/theme.ts';

interface GroupDetailSheetProps {
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

export function GroupDetailSheet({ group, currentUserId, onClose, onMutated }: GroupDetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      header={<Modal.Header after={<Modal.Close />}>{group.code}</Modal.Header>}
    >
      <div style={{ padding: '0 16px 32px' }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: theme.border, borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Title + meta */}
        <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary, marginBottom: 4 }}>
          {group.title}
        </div>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
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
              marginBottom: 16,
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
        <div style={{ marginBottom: 16 }}>
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

        {/* Action button */}
        {action && (
          <button
            onClick={handleAction}
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
      </div>
    </Modal>
  );
}
