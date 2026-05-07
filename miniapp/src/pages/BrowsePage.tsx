/**
 * @fileoverview BrowsePage — Tab 1. Lists open/full groups; supports join-by-code lookup.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Spinner, Placeholder } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';

import { getGroups, getGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';
import { JoinByCodeInput } from '../components/JoinByCodeInput.tsx';

/**
 * Renders an inline loading spinner centred in the page.
 *
 * @returns A flex container with a Spinner.
 */
function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
      <Spinner size="m" />
    </div>
  );
}

/**
 * Renders a friendly empty state when no groups are available.
 *
 * @returns A Placeholder component with instructional copy.
 */
function EmptyState() {
  return (
    <Placeholder
      header="No open groups yet"
      description="Be the first! Switch to the Create tab to start a new group order."
    />
  );
}

/**
 * Browse tab — shows all open/full food groups with SWR polling.
 * Users can tap a card to open GroupDetailSheet, or look up a group by code.
 *
 * @returns The browse page JSX element.
 */
export function BrowsePage() {
  const { data: groups, error, mutate } = useSWR<FoodGroup[]>('/api/groups', getGroups, {
    refreshInterval: 30_000,
  });

  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const userId = useSignal(initData.user)?.id ?? 0;

  /**
   * Fetches and opens the detail sheet for a tapped group card.
   *
   * @param group - The tapped group.
   */
  async function handleCardTap(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    setLoadingDetail(true);
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } finally {
      setLoadingDetail(false);
    }
  }

  /**
   * Called when a group is found via the code input.
   *
   * @param group - The looked-up group detail.
   */
  function handleGroupFound(group: FoodGroupDetail) {
    hapticFeedback.impactOccurred('light');
    setSelected(group);
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <JoinByCodeInput onGroupFound={handleGroupFound} />

      <div style={{ padding: '12px 16px 0' }}>
        {!groups && !error && <LoadingState />}
        {error && (
          <p style={{ color: 'var(--tg-theme-destructive-text-color)', textAlign: 'center', marginTop: 32 }}>
            Failed to load groups.
          </p>
        )}
        {groups && groups.length === 0 && <EmptyState />}
        {groups && groups.length > 0 && (
          <>
            {loadingDetail && <LoadingState />}
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onTap={handleCardTap} />
            ))}
          </>
        )}
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
