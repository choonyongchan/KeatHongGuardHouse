// src/lib/theme.ts — style helpers over the CSS tokens in index.css. Light-only, game-like: chunky 3D buttons and cards.
import type { CSSProperties } from 'react';
import type { GroupStatus } from '../../shared/rules.ts';

export const theme = {
  accent: 'var(--app-accent)',
  accentFocus: 'var(--app-accent-focus)',
  accentLight: 'var(--app-accent-light)',
  accentShadow: 'var(--app-accent-shadow)',
  sun: 'var(--app-sun)',
  error: 'var(--app-error)',
  errorLight: 'var(--app-error-light)',
  textPrimary: 'var(--app-text-primary)',
  textSecondary: 'var(--app-text-secondary)',
  textMuted: 'var(--app-text-muted)',
  cardBg: 'var(--app-card-bg)',
  pageBg: 'var(--app-page-bg)',
  border: 'var(--app-border)',
  badgeBg: 'var(--app-badge-bg)',
  /** Height of the bottom tab bar, safe area included. */
  dockHeight: 'var(--app-dock-h)',
  /** Side padding that also centres content in a max-width column on wide screens. */
  gutter: 'var(--app-gutter)',
} as const;

/** Page shell. `bottom` reserves room for fixed bars stacked above the tab bar. */
export function pageStyle(bottom = 0): CSSProperties {
  return {
    maxWidth: 'var(--app-max-w)', margin: '0 auto',
    padding: `env(safe-area-inset-top) 16px calc(${theme.dockHeight} + ${bottom + 24}px)`,
  };
}

/** One UI viewing area: a large title with air above it, in the top part of the screen. */
export const headerStyle: CSSProperties = { padding: 'clamp(24px, 9vh, 88px) 4px 24px' };
export const titleStyle: CSSProperties = {
  margin: 0, fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 900, lineHeight: 1.1, color: theme.textPrimary,
};
export const subtitleStyle: CSSProperties = { margin: '8px 0 0', fontSize: 17, fontWeight: 600, color: theme.textSecondary };

/** One UI interaction area: a frosted bar pinned just above the tab bar. */
export const bottomBarStyle: CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: theme.dockHeight, zIndex: 90,
  padding: `12px ${theme.gutter}`, background: 'var(--app-frosted)',
  backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
  borderTop: `2px solid ${theme.border}`,
};

/** Card list: one column on phones, two on tablets. */
export const gridStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12,
};

export const cardStyle: CSSProperties = {
  background: theme.cardBg, borderRadius: 20, border: `2px solid ${theme.border}`, boxShadow: `0 4px 0 ${theme.border}`,
};

export function chipStyle(selected: boolean): CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 9999,
    border: `2px solid ${selected ? theme.accent : theme.border}`,
    boxShadow: `0 3px 0 ${selected ? theme.accentShadow : theme.border}`,
    background: selected ? theme.accentLight : theme.cardBg,
    color: selected ? theme.accent : theme.textPrimary,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

export function buttonStyle(kind: 'primary' | 'outline' | 'danger', disabled = false): CSSProperties {
  const base: CSSProperties = {
    width: '100%',
    minHeight: 50,
    padding: '12px 22px',
    borderRadius: 16,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 0.3,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
  if (kind === 'primary') return { ...base, background: theme.accent, color: '#fff', border: 'none', boxShadow: `0 4px 0 ${theme.accentShadow}` };
  const color = kind === 'danger' ? theme.error : theme.accent;
  return { ...base, background: theme.cardBg, color, border: `2px solid ${theme.border}`, boxShadow: `0 4px 0 ${theme.border}` };
}

export const sectionLabelStyle: CSSProperties = {
  fontSize: 13, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: theme.textMuted, margin: '0 4px 8px',
};

/** Open is the accent, everything else neutral. */
export function statusBadge(status: GroupStatus): { label: string; bg: string; color: string } {
  if (status === 'open') return { label: 'Open', bg: theme.accentLight, color: theme.accent };
  return { label: status[0].toUpperCase() + status.slice(1), bg: theme.badgeBg, color: theme.textSecondary };
}
