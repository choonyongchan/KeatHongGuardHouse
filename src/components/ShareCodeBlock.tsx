import { useState } from 'react';
import { track } from '@vercel/analytics/react';
import { hapticFeedback } from '@tma.js/sdk-react';
import { copyInviteCode, shareInvite } from '../lib/share.ts';
import { theme } from '../lib/theme.ts';

interface ShareCodeBlockProps {
  code: string;
  title: string;
  shareLabel?: string;
  caption?: string;
  marginBottom?: number;
  codeFontSize?: number;
}

export function ShareCodeBlock({
  code, title, shareLabel = 'Share', caption, marginBottom = 0, codeFontSize = 28,
}: ShareCodeBlockProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function flashCopyFeedback(message: string) {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  async function handleCopyCode() {
    hapticFeedback.impactOccurred('light');
    track('Copy Group Code', { code });
    try {
      await copyInviteCode(code);
      flashCopyFeedback('Code copied!');
    } catch {
      flashCopyFeedback('Could not copy');
    }
  }

  async function handleShare() {
    hapticFeedback.impactOccurred('light');
    track('Share Group Link', { code });
    try {
      const result = await shareInvite(code, title);
      if (result === 'copied') flashCopyFeedback('Link copied!');
    } catch {
      flashCopyFeedback('Could not share');
    }
  }

  return (
    <div style={{
      background: theme.accentLight,
      border: `1.5px solid ${theme.accentBorder}`,
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom,
      textAlign: 'center',
    }}>
      {caption && (
        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
          {caption}
        </div>
      )}
      <div style={{
        fontSize: codeFontSize, fontWeight: 800, letterSpacing: 3,
        color: theme.textPrimary, fontFamily: 'monospace',
        marginBottom: 12, wordBreak: 'break-all',
      }}>
        {code}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => void handleCopyCode()}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            background: theme.cardBg, color: theme.textPrimary,
            border: `1.5px solid ${theme.accentBorder}`,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          📋 Copy
        </button>
        <button
          onClick={() => void handleShare()}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            background: theme.accent, color: '#fff',
            border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ↗ {shareLabel}
        </button>
      </div>
      {copyFeedback && (
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, marginTop: 8 }}>
          {copyFeedback}
        </div>
      )}
    </div>
  );
}
