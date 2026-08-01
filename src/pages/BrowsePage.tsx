import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';
import { useNavigate } from 'react-router-dom';

import { getGroups, getGroup, joinGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailPanel } from '../components/GroupDetailPanel.tsx';
import { JoinByCodeInput } from '../components/JoinByCodeInput.tsx';
import { useToast } from '../components/ToastProvider.tsx';
import { theme } from '../lib/theme.ts';
import { consumePendingInviteCode } from '../lib/pendingInvite.ts';

function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
      <Spinner size="m" />
    </div>
  );
}

export function BrowsePage() {
  const { data: groups, error, mutate } = useSWR<FoodGroup[], Error>('/api/groups', getGroups, {
    refreshInterval: 30_000,
  });

  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;
  const navigate = useNavigate();
  const { showError } = useToast();

  async function handleDetails(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    if (selected?.code === group.code) {
      setSelected(null);
      return;
    }
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Failed to load group details');
    }
  }

  async function handleJoin(group: FoodGroup) {
    hapticFeedback.impactOccurred('medium');
    setJoiningId(group.id);
    try {
      await joinGroup(group.code);
      hapticFeedback.notificationOccurred('success');
      void mutate();
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Failed to join group');
    } finally {
      setJoiningId(null);
    }
  }

  function handleGroupFound(group: FoodGroupDetail) {
    hapticFeedback.impactOccurred('light');
    setSelected(group);
  }

  // Deep-link entry: a group code passed via ?startapp= on launch is looked
  // up and shown for confirmation, same as a manual code lookup.
  useEffect(() => {
    const code = consumePendingInviteCode();
    if (!code) return;
    getGroup(code)
      .then(handleGroupFound)
      .catch((e: unknown) => {
        hapticFeedback.notificationOccurred('error');
        showError(e instanceof Error ? e.message : 'Failed to load invited group');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCount = groups?.filter((g) => g.status === 'open').length ?? 0;
  const selectedInList = selected ? groups?.some((g) => g.code === selected.code) ?? false : false;

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>Browse</div>
        <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
          {groups
            ? openCount > 0 ? `${openCount} group${openCount === 1 ? '' : 's'} open` : 'No open groups'
            : ''}
        </div>
      </div>

      {/* Join by code */}
      <div style={{ marginBottom: 12 }}>
        <JoinByCodeInput onGroupFound={handleGroupFound} />
        {selected && !selectedInList && (
          <div style={{ padding: '0 16px' }}>
            <GroupDetailPanel
              group={selected}
              currentUserId={userId}
              onClose={() => setSelected(null)}
              onMutated={() => void mutate()}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {!groups && !error && <LoadingState />}

        {error && (
          <p style={{ color: theme.error, textAlign: 'center', marginTop: 32, fontSize: 13 }}>
            Failed to load groups.
          </p>
        )}

        {groups && groups.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>
              No open groups. Start one?
            </div>
            <button
              onClick={() => void navigate('/create')}
              style={{
                background: theme.accent, color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '10px 24px', fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Create a Group
            </button>
          </div>
        )}

        {groups && groups.map((g) => (
          <div key={g.id}>
            <GroupCard
              group={g}
              actions={g.status === 'open' ? [
                { label: 'Details', style: 'outline', onClick: () => void handleDetails(g) },
                { label: 'Join', style: 'primary', onClick: () => void handleJoin(g), loading: joiningId === g.id },
              ] : undefined}
            />
            {selected?.code === g.code && (
              <GroupDetailPanel
                group={selected}
                currentUserId={userId}
                onClose={() => setSelected(null)}
                onMutated={() => void mutate()}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
