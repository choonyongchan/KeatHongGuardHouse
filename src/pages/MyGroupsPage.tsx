import { useState } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';

import { getMe, getGroup, cancelGroup, leaveGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail, UserProfile } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';
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
  const { data, error, mutate } = useSWR<UserProfile>('/api/users/me', getMe, {
    refreshInterval: 30_000,
  });
  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;

  async function handleDetails(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch {
      // ignore
    }
  }

  async function handleCancel(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setActionLoadingId(group.id);
    try {
      await cancelGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch {
      hapticFeedback.notificationOccurred('error');
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
    } catch {
      hapticFeedback.notificationOccurred('error');
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
              { label: 'Details', style: 'outline', onClick: () => handleDetails(g) },
              { label: 'Cancel Group', style: 'danger', onClick: () => handleCancel(g), loading: actionLoadingId === g.id },
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
              { label: 'Details', style: 'outline', onClick: () => handleDetails(g) },
              { label: 'Leave', style: 'outline', onClick: () => handleLeave(g), loading: actionLoadingId === g.id },
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
    </div>
  );
}
