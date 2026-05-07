/**
 * @fileoverview GroupCard — compact summary card for a food group in a list.
 */

import type { FoodGroup } from '../types.ts';
import { formatCountdown } from '../lib/formatters.ts';

/** Props for GroupCard. */
interface GroupCardProps {
  /** The food group to display. */
  group: FoodGroup;
  /** Called when the card is tapped. */
  onTap: (group: FoodGroup) => void;
}

/**
 * Returns a status badge label and colour class for a group's status.
 *
 * @param status - The current group status.
 * @returns An object with a label string and a Telegram CSS variable colour.
 */
function statusBadge(status: FoodGroup['status']): { label: string; color: string } {
  switch (status) {
    case 'open':      return { label: 'Open',      color: 'var(--tg-theme-button-color)' };
    case 'full':      return { label: 'Full',       color: 'var(--tg-theme-destructive-text-color)' };
    case 'expired':   return { label: 'Expired',    color: 'var(--tg-theme-hint-color)' };
    case 'cancelled': return { label: 'Cancelled',  color: 'var(--tg-theme-hint-color)' };
  }
}

/**
 * Renders the seat fill bar (e.g. "3 / 5").
 *
 * @param current - Current member count.
 * @param max - Maximum member count.
 * @returns Formatted seat string.
 */
function formatSeats(current: number, max: number): string {
  return `${current} / ${max}`;
}

/**
 * A tappable summary card for a food group.
 * Uses only Telegram CSS variables for colours.
 *
 * @param props - GroupCardProps.
 * @returns A div element styled as a list card.
 */
export function GroupCard({ group, onTap }: GroupCardProps) {
  const badge = statusBadge(group.status);
  const isActive = group.status === 'open' || group.status === 'full';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(group)}
      onKeyDown={(e) => e.key === 'Enter' && onTap(group)}
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        background: 'var(--tg-theme-secondary-bg-color)',
        marginBottom: 8,
        cursor: 'pointer',
        opacity: isActive ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--tg-theme-text-color)', flex: 1 }}>
          {group.title}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: badge.color,
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {badge.label}
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 4,
        fontSize: 13,
        color: 'var(--tg-theme-hint-color)',
      }}>
        <span>👤 {formatSeats(group.current_count, group.max_members)}</span>
        {isActive && <span>⏱ {formatCountdown(group.expires_at)}</span>}
        <span>by {group.creator_first_name}</span>
      </div>
    </div>
  );
}
