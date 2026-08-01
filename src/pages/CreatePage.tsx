/**
 * @fileoverview CreatePage — Tab 2. Hosts the group creation stepper.
 */

import { useState } from 'react';
import { useSignal, initData } from '@tma.js/sdk-react';
import { Placeholder } from '@telegram-apps/telegram-ui';

import { getGroup } from '../lib/api.ts';
import type { FoodGroup, FoodGroupDetail } from '../types.ts';
import { CreateGroupStepper } from '../components/CreateGroupStepper.tsx';
import { GroupDetailPanel } from '../components/GroupDetailPanel.tsx';

/**
 * Create tab — renders the CreateGroupStepper and shows the new group's detail
 * panel immediately after a successful creation.
 *
 * @returns The create page JSX element.
 */
export function CreatePage() {
  const [createdGroup, setCreatedGroup] = useState<FoodGroupDetail | null>(null);
  const userId = useSignal(initData.user)?.id ?? 0;

  /**
   * Called by the stepper after the group is created.
   * Fetches the full detail (with members) and opens the sheet.
   *
   * @param group - The freshly created group returned by the API.
   */
  async function handleCreated(group: FoodGroup) {
    try {
      const detail = await getGroup(group.code);
      setCreatedGroup(detail);
    } catch {
      // If detail fetch fails, still show success feedback; user can browse to find it.
    }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {!createdGroup && (
        <>
          <Placeholder
            header="New Group Order 🍱"
            description="Fill in the details below to create a group and share it with neighbours."
            style={{ paddingBottom: 4 }}
          />
          <CreateGroupStepper onCreated={(group) => void handleCreated(group)} />
        </>
      )}

      {createdGroup && (
        <div style={{ padding: '0 16px' }}>
          <GroupDetailPanel
            group={createdGroup}
            currentUserId={userId}
            onClose={() => setCreatedGroup(null)}
            onMutated={() => {}}
          />
        </div>
      )}
    </div>
  );
}
