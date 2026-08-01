import { useState } from 'react';
import useSWR from 'swr';
import { Modal, Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';

import { getMe, getGroup, cancelGroup, leaveGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail, UserProfile } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';
import { useToast } from '../components/ToastProvider.tsx';
import { theme } from '../lib/theme.ts';

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      color: theme.textSecondary, marginBottom: 8,
    }}>
      {label}
    </div>
  );
}

function EmptySectionNote({ message }: { message: string }) {
  return (
    <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>{message}</p>
  );
}

export function MyGroupsPage() {
  const { data, error, mutate } = useSWR<UserProfile, Error>('/api/users/me', getMe, {
    refreshInterval: 30_000,
  });
  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<FoodGroup | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;
  const { showError } = useToast();

  async function handleDetails(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Failed to load group details');
    }
  }

  async function handleCancel(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setActionLoadingId(group.id);
    try {
      await cancelGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Failed to cancel group');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleLeave(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setActionLoadingId(group.id);
    try {
      await leaveGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Failed to leave group');
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!data && !error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
        <Spinner size="m" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>My Groups</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* LEADING */}
        <SectionLabel label="LEADING" />
        {data?.createdGroups.length === 0 && (
          <EmptySectionNote message="You're not leading any groups" />
        )}
        {data?.createdGroups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            actions={[
              { label: 'Details', style: 'outline', onClick: () => void handleDetails(g) },
              { label: 'Cancel Group', style: 'danger', onClick: () => setConfirmTarget(g), loading: actionLoadingId === g.id },
            ]}
          />
        ))}

        {/* JOINED */}
        <SectionLabel label="JOINED" />
        {data?.joinedGroups.length === 0 && (
          <EmptySectionNote message="You haven't joined any groups" />
        )}
        {data?.joinedGroups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            actions={[
              { label: 'Details', style: 'outline', onClick: () => void handleDetails(g) },
              { label: 'Leave', style: 'outline', onClick: () => void handleLeave(g), loading: actionLoadingId === g.id },
            ]}
          />
        ))}
      </div>

      {selected && (
        <GroupDetailSheet
          group={selected}
          currentUserId={userId}
          onClose={() => setSelected(null)}
          onMutated={() => void mutate()}
        />
      )}

      {confirmTarget && (
        <Modal
          open
          onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
          header={<Modal.Header after={<Modal.Close />}>Confirm Delete</Modal.Header>}
        >
          <div style={{ padding: '0 16px 32px' }}>
            <p style={{ fontSize: 13, color: theme.textPrimary, marginBottom: 20 }}>
              Cancel "{confirmTarget.title}"? This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmTarget(null)}
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
                onClick={() => { void handleCancel(confirmTarget); setConfirmTarget(null); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'transparent', color: theme.error,
                  border: `1.5px solid ${theme.error}`,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
