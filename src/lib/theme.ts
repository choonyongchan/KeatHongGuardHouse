// src/lib/theme.ts
import type { CSSProperties } from 'react';
import type { GroupStatus } from '../../shared/rules.ts';

export const theme = {
  accent: 'var(--app-accent)',
  accentLight: 'var(--app-accent-light)',
  accentBorder: 'var(--app-accent-border)',
  error: 'var(--app-error)',
  errorLight: 'var(--app-error-light)',
  errorBorder: 'var(--app-error-border)',
  textPrimary: 'var(--app-text-primary)',
  textSecondary: 'var(--app-text-secondary)',
  textMuted: 'var(--app-text-muted)',
  cardBg: 'var(--app-card-bg)',
  pageBg: 'var(--app-page-bg)',
  border: 'var(--app-border)',
  shadow: 'var(--app-shadow)',
  badgeBg: 'var(--app-badge-bg)',
  warningBg: 'var(--app-warning-bg)',
  warningText: 'var(--app-warning-text)',
} as const;

export function chipStyle(selected: boolean): CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 20,
    border: selected ? `2px solid ${theme.accent}` : `1.5px solid ${theme.border}`,
    background: selected ? theme.accentLight : 'transparent',
    color: selected ? theme.accent : theme.textSecondary,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

export function buttonStyle(kind: 'primary' | 'outline' | 'danger', disabled = false): CSSProperties {
  const base: CSSProperties = {
    width: '100%',
    padding: '11px 0',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
  if (kind === 'primary') return { ...base, background: theme.accent, color: '#fff', border: 'none' };
  if (kind === 'danger') return { ...base, background: 'transparent', color: theme.error, border: `1.5px solid ${theme.error}` };
  return { ...base, background: 'transparent', color: theme.textSecondary, border: `1.5px solid ${theme.border}` };
}

export const sectionLabelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: theme.textSecondary, marginBottom: 8,
};

export function statusBadge(status: GroupStatus): { label: string; bg: string; color: string } {
  if (status === 'open') return { label: 'OPEN', bg: theme.accentLight, color: theme.accent };
  if (status === 'full') return { label: 'FULL', bg: theme.warningBg, color: theme.warningText };
  return { label: status.toUpperCase(), bg: theme.badgeBg, color: theme.textMuted };
}
