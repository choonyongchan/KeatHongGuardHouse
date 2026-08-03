/**
 * @fileoverview Display formatting utilities for the KeatHong MiniApp.
 * Adapted from the bot's src/utils/formatters.ts.
 */

const SGT = 'Asia/Singapore';

/**
 * Formats an ISO date string as a 12-hour Singapore time (e.g. "9:30pm").
 *
 * @param isoDate - ISO 8601 date string from the API.
 * @returns Localised time string in SGT.
 */
export function formatExpiry(isoDate: string): string {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SGT,
  }).format(new Date(isoDate));
}

/**
 * Returns a human-readable countdown label (e.g. "in 42 min", "in 2h 5m", "Expired").
 *
 * @param isoDate - ISO 8601 expiry date string.
 * @returns Countdown string relative to now.
 */
export function formatCountdown(isoDate: string): string {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 60) return `in ${totalMin}m`;

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
}

/**
 * Formats a member's display name, preferring @username over first name.
 *
 * @param firstName - The member's first name.
 * @param username - The member's @username, or null.
 * @returns Display name string.
 */
export function formatMemberName(firstName: string, username: string | null): string {
  return username ? `@${username}` : firstName;
}

/**
 * Returns a human-readable duration label (e.g. "58min", "2h 5min", "2h", "Expired").
 *
 * @param isoDate - ISO 8601 expiry date string.
 * @returns Duration string relative to now.
 */
export function formatDurationLabel(isoDate: string): string {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 60) return `${totalMin}min`;

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
