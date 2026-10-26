import { Spinner } from '@telegram-apps/telegram-ui';
import { categoryOf, isActive, type Group } from '../../shared/rules.ts';
import { formatTimeLeft, platformLabel } from '../../shared/format.ts';
import { cardStyle, statusBadge, theme } from '../lib/theme.ts';

interface GroupCardProps {
  group: Group;
  onOpen: () => void;
  /** Shown as a one-tap Join button when the user can join. */
  onJoin?: () => void;
  joining?: boolean;
}

/** Dots for small caps (●●●○○), plain text for big or uncapped groups. */
function Slots({ current, max }: { current: number; max: number | null }) {
  if (max === null || max > 10) {
    return <>{max === null ? `${current} joined` : `${current}/${max}`}</>;
  }
  return (
    <span aria-label={`${current} of ${max} spots taken`} style={{ letterSpacing: 1 }}>
      <span style={{ color: theme.accent }}>{'●'.repeat(current)}</span>
      {'○'.repeat(Math.max(0, max - current))}
    </span>
  );
}

export function GroupCard({ group, onOpen, onJoin, joining }: GroupCardProps) {
  const badge = statusBadge(group.status);
  const active = isActive(group.status);
  const meta = [`by ${group.creatorFirstName}`, group.externalLink && platformLabel(group.externalLink)]
    .filter(Boolean).join(' · ');

  return (
    <div
      onClick={onOpen}
      role="button"
      style={{
        ...cardStyle, display: 'flex', alignItems: 'center', gap: 12,
        padding: 16, minWidth: 0, cursor: 'pointer', opacity: active ? 1 : 0.5,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: theme.pageBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {categoryOf(group.category).emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 17, lineHeight: 1.24, color: theme.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {group.title}
        </div>
        <div style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
          <Slots current={group.currentCount} max={group.maxMembers} />
          {active && ` · ${formatTimeLeft(group.expiresAt)} left`}
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{meta}</div>
      </div>

      {onJoin ? (
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
          disabled={joining}
          aria-label={`Join ${group.title}`}
          style={{
            background: theme.accent, color: '#fff', border: 'none', borderRadius: 9999,
            minHeight: 36, padding: '6px 18px', fontSize: 14, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {joining ? <Spinner size="s" /> : 'Join'}
        </button>
      ) : (
        <span style={{
          background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 600,
          padding: '3px 10px', borderRadius: 9999, flexShrink: 0,
        }}>
          {group.joined && active ? 'Joined' : badge.label}
        </span>
      )}
    </div>
  );
}
