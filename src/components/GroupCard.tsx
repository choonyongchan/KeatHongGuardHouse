import { Spinner } from '@telegram-apps/telegram-ui';
import { categoryOf, isActive, type Group } from '../../shared/rules.ts';
import { formatTimeLeft, platformLabel } from '../../shared/format.ts';
import { statusBadge, theme } from '../lib/theme.ts';

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
  const category = categoryOf(group.category);
  const meta = [`by ${group.creatorFirstName}`, group.externalLink && platformLabel(group.externalLink)]
    .filter(Boolean).join(' · ');

  return (
    <div
      onClick={onOpen}
      role="button"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: theme.cardBg, borderRadius: 14, padding: 12, marginBottom: 8,
        boxShadow: theme.shadow, cursor: 'pointer', opacity: active ? 1 : 0.55,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: theme.accentLight, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {category.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 14, color: theme.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {group.title}
        </div>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
          <Slots current={group.currentCount} max={group.maxMembers} />
          {active && ` · ${formatTimeLeft(group.expiresAt)} left`}
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{meta}</div>
      </div>

      {onJoin ? (
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
          disabled={joining}
          aria-label={`Join ${group.title}`}
          style={{
            background: theme.accent, color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {joining ? <Spinner size="s" /> : 'Join'}
        </button>
      ) : (
        <span style={{
          background: badge.bg, color: badge.color, fontSize: 9, fontWeight: 700,
          padding: '3px 7px', borderRadius: 20, flexShrink: 0,
        }}>
          {group.joined && active ? 'JOINED' : badge.label}
        </span>
      )}
    </div>
  );
}
