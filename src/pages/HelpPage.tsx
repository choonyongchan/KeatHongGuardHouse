/**
 * @fileoverview HelpPage — Tab 5. Static how-to guide for new users.
 */

import { theme } from '../lib/theme.ts';

interface Step {
  emoji: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    emoji: '➕',
    title: 'Create a group',
    description: 'Go to Create → fill in a title, order link, expiry and member cap → tap Create.',
  },
  {
    emoji: '↗',
    title: 'Share it',
    description: 'Open your group’s details, then tap Share (or Copy code) to send the invite to neighbours via Telegram or your phone’s share sheet.',
  },
  {
    emoji: '🍱',
    title: 'Join a group',
    description: 'Browse public groups on the Browse tab, or paste a code or link into "Have a code or link?" → tap Join.',
  },
  {
    emoji: '👤',
    title: 'Manage or delete',
    description: 'Go to Mine → your hosted groups. Tap Cancel to close a group you created, or Leave to exit one you joined.',
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: theme.cardBg,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 10,
      boxShadow: theme.shadow,
    }}>
      <div style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 10,
        background: theme.accentLight,
        border: `1.5px solid ${theme.accentBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
      }}>
        {step.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: theme.accent, marginBottom: 2 }}>
          STEP {index + 1}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>
          {step.description}
        </div>
      </div>
    </div>
  );
}

/**
 * Help tab — a static one-page guide explaining the app's purpose and core flows.
 *
 * @returns The help page JSX element.
 */
export function HelpPage() {
  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, marginBottom: 8 }}>
          Welcome to KeatHong GuardHouse 👋
        </div>
        <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>
          Connect with neighbours for Grab/Foodpanda order-in discounts, carpool buddies, gaming buddies and more!
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {STEPS.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} />
        ))}
      </div>

      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.5 }}>
          Need more help? Head to Settings to send feedback, or come back here anytime via ❓.
        </div>
      </div>
    </div>
  );
}
