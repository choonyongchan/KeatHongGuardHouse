import type { CSSProperties } from 'react';
import type { FoodGroup } from '../types.ts';
import { formatCountdown } from '../lib/formatters.ts';
import { theme } from '../lib/theme.ts';

export interface CardAction {
  label: string;
  style: 'primary' | 'outline' | 'danger';
  onClick: () => void;
  loading?: boolean;
}

interface GroupCardProps {
  group: FoodGroup;
  actions?: CardAction[];
}

function statusBadge(status: FoodGroup['status']): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case 'open':      return { label: 'OPEN',      bg: theme.accentLight, color: theme.accent,      border: theme.accentBorder };
    case 'full':      return { label: 'FULL',       bg: theme.errorLight,  color: theme.error,       border: theme.errorBorder };
    case 'expired':   return { label: 'EXPIRED',    bg: theme.badgeBg,     color: theme.textMuted,   border: theme.border };
    case 'cancelled': return { label: 'CANCELLED',  bg: theme.badgeBg,     color: theme.textMuted,   border: theme.border };
  }
}

function platformLabel(link: string): string {
  try {
    const host = new URL(link).hostname;
    if (host.includes('grab.com'))      return 'GrabFood';
    if (host.includes('foodpanda.com')) return 'Foodpanda';
    return host.replace('www.', '');
  } catch {
    return '';
  }
}

function formatSpots(current: number, max: number | null): string {
  return max === null ? `${current} joined` : `${current} of ${max} spots`;
}

function actionButtonStyle(style: CardAction['style']): CSSProperties {
  const base: CSSProperties = {
    flex: style === 'primary' ? 2 : 1,
    padding: '6px 0',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    textAlign: 'center',
  };
  if (style === 'primary') return { ...base, background: theme.accent, color: '#fff' };
  if (style === 'danger')  return { ...base, background: 'transparent', color: theme.error, border: `1.5px solid ${theme.error}` };
  return { ...base, background: 'transparent', color: theme.textSecondary, border: `1.5px solid ${theme.border}` };
}

export function GroupCard({ group, actions }: GroupCardProps) {
  const badge = statusBadge(group.status);
  const isActive = group.status === 'open' || group.status === 'full';
  const platform = group.external_link ? platformLabel(group.external_link) : '';

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        boxShadow: theme.shadow,
        opacity: isActive ? 1 : 0.55,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: actions?.length ? 10 : 0 }}>
        {/* Icon box */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: theme.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          🍽️
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 13, color: theme.textPrimary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {group.title}
          </div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            {formatSpots(group.current_count, group.max_members)}
            {isActive && ` · ${formatCountdown(group.expires_at)}`}
          </div>
          {(group.creator_first_name || platform) && (
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
              {[group.creator_first_name && `by ${group.creator_first_name}`, platform].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Status badge */}
        <span style={{
          background: badge.bg, color: badge.color,
          border: `1px solid ${badge.border}`,
          fontSize: 9, fontWeight: 700,
          padding: '3px 7px', borderRadius: 20, flexShrink: 0,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 7 }}>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              style={actionButtonStyle(action.style)}
              aria-label={action.label}
            >
              {action.loading ? '…' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
