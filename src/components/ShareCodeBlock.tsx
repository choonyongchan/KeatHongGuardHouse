import { useState } from 'react';
import { track } from '@vercel/analytics/react';
import { hapticFeedback } from '@tma.js/sdk-react';
import { shareInvite } from '../lib/share.ts';
import { theme } from '../lib/theme.ts';

interface ShareCodeBlockProps {
  code: string;
  title: string;
  marginBottom?: number;
}

export function ShareCodeBlock({ code, title, marginBottom = 0 }: ShareCodeBlockProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function flash(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handle(kind: 'copy' | 'share') {
    hapticFeedback.impactOccurred('light');
    track(kind === 'copy' ? 'Copy Group Code' : 'Share Group Link', { code });
    try {
      if (kind === 'copy') {
        await navigator.clipboard.writeText(code);
        flash('Code copied!');
      } else if ((await shareInvite(code, title)) === 'copied') {
        flash('Link copied!');
      }
    } catch {
      flash(kind === 'copy' ? 'Could not copy' : 'Could not share');
    }
  }

  const button = { flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' };

  return (
    <div style={{
      background: theme.accentLight, border: `1.5px solid ${theme.accentBorder}`,
      borderRadius: 12, padding: '12px 14px', marginBottom, textAlign: 'center',
    }}>
      <div style={{
        fontSize: 24, fontWeight: 800, letterSpacing: 3, color: theme.textPrimary,
        fontFamily: 'monospace', marginBottom: 10, wordBreak: 'break-all',
      }}>
        {code}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => void handle('copy')}
          style={{ ...button, background: theme.cardBg, color: theme.textPrimary, border: `1.5px solid ${theme.accentBorder}` }}
        >
          📋 Copy
        </button>
        <button
          onClick={() => void handle('share')}
          style={{ ...button, background: theme.accent, color: '#fff', border: 'none' }}
        >
          ↗ Share
        </button>
      </div>
      {feedback && <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, marginTop: 8 }}>{feedback}</div>}
    </div>
  );
}
