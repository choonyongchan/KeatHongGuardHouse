/**
 * @fileoverview GroupDetailSheet — bottom-sheet modal showing full group detail and actions.
 */

import { useState } from 'react';
import { Modal, Button, Spinner } from '@telegram-apps/telegram-ui';
import type { FoodGroupDetail } from '../types.ts';
import { formatExpiry, formatMemberName, formatCountdown } from '../lib/formatters.ts';
import { joinGroup, leaveGroup, cancelGroup } from '../lib/api.ts';

/** Props for GroupDetailSheet. */
interface GroupDetailSheetProps {
  /** The group to display, with members attached. */
  group: FoodGroupDetail;
  /** Telegram ID of the currently authenticated user. */
  currentUserId: number;
  /** Called when the modal should close. */
  onClose: () => void;
  /** Called after a successful action (join/leave/cancel) to trigger a data refresh. */
  onMutated: () => void;
}

/**
 * Determines which primary action is available for the current user.
 *
 * @param group - The group detail object.
 * @param userId - Telegram ID of the current user.
 * @returns 'join' | 'leave' | 'cancel' | null
 */
function resolveAction(
  group: FoodGroupDetail,
  userId: number,
): 'join' | 'leave' | 'cancel' | null {
  const isMember = group.members.some((m) => m.user_id === userId);
  const isCreator = group.creator_id === userId;
  const isActive = group.status === 'open' || group.status === 'full';

  if (!isActive) return null;
  if (isCreator) return 'cancel';
  if (isMember) return 'leave';
  if (group.status === 'open') return 'join';
  return null;
}

/**
 * Returns the button label and style variant for a given action.
 *
 * @param action - The resolved action type.
 * @returns Label string and mode for the Button component.
 */
function actionButton(action: 'join' | 'leave' | 'cancel'): {
  label: string;
  mode: 'filled' | 'outline' | 'bezeled' | 'plain' | 'gray';
} {
  switch (action) {
    case 'join':   return { label: 'Join Group 🟢',    mode: 'filled' };
    case 'leave':  return { label: 'Leave Group 🚪',   mode: 'outline' };
    case 'cancel': return { label: 'Cancel Group ❌',   mode: 'outline' };
  }
}

/**
 * Executes the appropriate API call for an action.
 *
 * @param action - The action to perform.
 * @param code - The group code.
 */
async function performAction(action: 'join' | 'leave' | 'cancel', code: string): Promise<void> {
  if (action === 'join')   await joinGroup(code);
  if (action === 'leave')  await leaveGroup(code);
  if (action === 'cancel') await cancelGroup(code);
}

/**
 * Bottom-sheet modal displaying group detail, member list, and contextual action button.
 *
 * @param props - GroupDetailSheetProps.
 * @returns A Telegram UI Modal component.
 */
export function GroupDetailSheet({
  group,
  currentUserId,
  onClose,
  onMutated,
}: GroupDetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = resolveAction(group, currentUserId);

  /**
   * Handles the primary action button tap.
   * Shows a loading state, performs the API call, and calls onMutated on success.
   */
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

  const btn = action ? actionButton(action) : null;

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      header={<Modal.Header after={<Modal.Close />}>{group.code}</Modal.Header>}
    >
      <div style={{ padding: '0 16px 24px' }}>
        {/* Title + meta */}
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--tg-theme-text-color)' }}>
          {group.title}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          👑 {formatMemberName(group.creator_first_name, group.creator_username)}
          &nbsp;·&nbsp;
          {group.current_count}/{group.max_members} members
          &nbsp;·&nbsp;
          expires {formatExpiry(group.expires_at)} ({formatCountdown(group.expires_at)})
        </p>

        {/* External link */}
        {group.external_link && (
          <a
            href={group.external_link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              marginBottom: 16,
              color: 'var(--tg-theme-link-color)',
              fontSize: 14,
            }}
          >
            🔗 Open GrabFood / Order Link
          </a>
        )}

        {/* Member list */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
            MEMBERS
          </p>
          {group.members.map((m, i) => (
            <div
              key={m.user_id}
              style={{
                fontSize: 14,
                color: 'var(--tg-theme-text-color)',
                padding: '4px 0',
              }}
            >
              {i === 0 ? '👑 ' : '· '}
              {formatMemberName(m.first_name, m.username)}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p style={{ color: 'var(--tg-theme-destructive-text-color)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* Action button */}
        {btn && (
          <Button
            mode={btn.mode}
            size="l"
            stretched
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? <Spinner size="s" /> : btn.label}
          </Button>
        )}
      </div>
    </Modal>
  );
}
