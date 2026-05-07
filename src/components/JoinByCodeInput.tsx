import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { getGroup } from '../lib/api.ts';
import type { FoodGroupDetail } from '../types.ts';
import { theme } from '../lib/theme.ts';

interface JoinByCodeInputProps {
  onGroupFound: (group: FoodGroupDetail) => void;
}

function sanitiseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

export function JoinByCodeInput({ onGroupFound }: JoinByCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div style={{ padding: '0 16px', marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Have a code? Enter it…"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            border: `1.5px solid ${error ? theme.error : theme.border}`,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            background: theme.cardBg,
            color: theme.textPrimary,
            outline: 'none',
          }}
          aria-label="Group invite code"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !sanitiseCode(code)}
          style={{
            background: theme.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !sanitiseCode(code) ? 'not-allowed' : 'pointer',
            opacity: loading || !sanitiseCode(code) ? 0.6 : 1,
            flexShrink: 0,
          }}
          aria-label="Look up group by code"
        >
          {loading ? <Spinner size="s" /> : 'Go'}
        </button>
      </div>
      {error && (
        <p style={{ color: theme.error, fontSize: 11, margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  );
}
