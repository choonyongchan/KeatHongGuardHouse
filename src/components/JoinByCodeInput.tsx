import { useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { getGroup, joinGroup } from '../lib/api.ts';
import type { FoodGroupDetail } from '../types.ts';
import { theme } from '../lib/theme.ts';

interface JoinByCodeInputProps {
  onGroupFound: (group: FoodGroupDetail) => void;
  onJoined: (code: string) => void;
}

const SHARE_LINK_CODE_RE = /startapp=([A-Za-z]+)/i;

function sanitiseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

// A pasted share link (e.g. https://t.me/bot/app?startapp=ABCDEF) carries its
// code in the `startapp` param; plain manual entry is just letters.
function parseInput(raw: string): { code: string; isLink: boolean } {
  const linkMatch = raw.match(SHARE_LINK_CODE_RE);
  if (linkMatch) return { code: linkMatch[1].toUpperCase(), isLink: true };
  return { code: sanitiseCode(raw), isLink: false };
}

export function JoinByCodeInput({ onGroupFound, onJoined }: JoinByCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const { code: clean, isLink } = parseInput(code);
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      if (isLink) {
        await joinGroup(clean);
        hapticFeedback.notificationOccurred('success');
        onJoined(clean);
      } else {
        const group = await getGroup(clean);
        onGroupFound(group);
      }
      setCode('');
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      setError(e instanceof Error ? e.message : isLink ? 'Failed to join group' : 'Group not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '0 16px', marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Have a code or link? Paste it…"
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
          onClick={() => void handleLookup()}
          disabled={loading || !parseInput(code).code}
          style={{
            background: theme.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !parseInput(code).code ? 'not-allowed' : 'pointer',
            opacity: loading || !parseInput(code).code ? 0.6 : 1,
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
