/**
 * @fileoverview JoinByCodeInput — inline form to join a group by entering its code.
 */

import { useState } from 'react';
import { Input, Button, Spinner } from '@telegram-apps/telegram-ui';
import { getGroup } from '../lib/api.ts';
import type { FoodGroupDetail } from '../types.ts';

/** Props for JoinByCodeInput. */
interface JoinByCodeInputProps {
  /** Called with the fetched group when a valid code is looked up. */
  onGroupFound: (group: FoodGroupDetail) => void;
}

/**
 * Normalises a raw code input: uppercase, strip non-alpha characters.
 *
 * @param raw - Raw user input string.
 * @returns Sanitised uppercase code.
 */
function sanitiseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Inline code-entry form. On submit fetches the group and passes it to `onGroupFound`.
 * Does not perform the join — the caller decides when to join via GroupDetailSheet.
 *
 * @param props - JoinByCodeInputProps.
 * @returns A form with a text input and submit button.
 */
export function JoinByCodeInput({ onGroupFound }: JoinByCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the group for the entered code and forwards it to the parent.
   */
  async function handleLookup() {
    const clean = sanitiseCode(code);
    if (!clean) return;

    setLoading(true);
    setError(null);
    try {
      const group = await getGroup(clean);
      onGroupFound(group);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Group not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Input
          placeholder="Enter code (e.g. MANGO)"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
          status={error ? 'error' : undefined}
          header={error ?? undefined}
          style={{ flex: 1 }}
        />
        <Button
          size="m"
          mode="filled"
          onClick={handleLookup}
          disabled={loading || !sanitiseCode(code)}
          style={{ flexShrink: 0, marginTop: 6 }}
        >
          {loading ? <Spinner size="s" /> : 'Find'}
        </Button>
      </div>
    </div>
  );
}
