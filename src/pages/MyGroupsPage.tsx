/**
 * @fileoverview MyGroupsPage — Tab 3. Shows groups the user created and joined.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Spinner, Placeholder } from '@telegram-apps/telegram-ui';
import { hapticFeedback, useSignal, initData } from '@tma.js/sdk-react';

import { getMe, getGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail, UserProfile } from '../types.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { GroupDetailSheet } from '../components/GroupDetailSheet.tsx';

/**
 * Renders a labelled section of group cards.
 *
 * @param props.title - Section heading text.
 * @param props.groups - Groups to render.
 * @param props.onTap - Called when a card is tapped.
 * @returns A section div with heading and cards.
 */
function GroupSection({
  title,
  groups,
  onTap,
}: {
  title: string;
  groups: FoodGroup[];
  onTap: (g: FoodGroup) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.5,
        color: 'var(--tg-theme-hint-color)',
        padding: '0 16px',
        margin: '0 0 6px',
      }}>
        {title.toUpperCase()}
      </p>
      <div style={{ padding: '0 16px' }}>
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

/**
 * My Groups tab — displays the authenticated user's created and joined groups.
 * Tapping a card opens GroupDetailSheet.
 *
 * @returns The my-groups page JSX element.
 */
export function MyGroupsPage() {
  const { data, error, mutate } = useSWR<UserProfile>('/api/users/me', getMe, {
    refreshInterval: 30_000,
  });

  const [selected, setSelected] = useState<FoodGroupDetail | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;

  /**
   * Fetches group detail and opens the sheet when a card is tapped.
   *
   * @param group - The tapped group.
   */
  async function handleCardTap(group: FoodGroup) {
    hapticFeedback.impactOccurred('light');
    try {
      const detail = await getGroup(group.code);
      setSelected(detail);
    } catch {
      // Group may have been deleted; ignore silently.
    }
  }

  if (!data && !error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
        <Spinner size="m" />
      </div>
    );
  }

  const hasAny = (data?.createdGroups.length ?? 0) + (data?.joinedGroups.length ?? 0) > 0;

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      {!hasAny && (
        <Placeholder
          header="No groups yet"
          description="Create a new group or join one from the Browse tab."
        />
      )}

      {data && (
        <>
          <GroupSection
            title="Groups I Lead"
            groups={data.createdGroups}
            onTap={handleCardTap}
          />
          <GroupSection
            title="Groups I Joined"
            groups={data.joinedGroups}
            onTap={handleCardTap}
          />
        </>
      )}

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
