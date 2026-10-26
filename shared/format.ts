/**
 * @fileoverview Display formatters, imported by both api/ (bot DMs) and src/.
 */

const timeFormat = new Intl.DateTimeFormat('en-SG', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Singapore',
});

/** "9:30 pm" in SGT. */
export function formatExpiry(date: Date | string): string {
  return timeFormat.format(new Date(date));
}

/** "42m", "2h 5m", "2h", or "Expired". */
export function formatTimeLeft(date: Date | string, now = Date.now()): string {
  const totalMin = Math.floor((new Date(date).getTime() - now) / 60_000);
  if (totalMin <= 0) return 'Expired';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function memberName(firstName: string, username: string | null): string {
  return username ? `@${username}` : firstName;
}

export function inviteLink(base: string, code: string): string {
  return `${base}?startapp=${code}`;
}

/** "GrabFood", "Foodpanda", or the bare hostname. */
export function platformLabel(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    if (host.endsWith('grab.com')) return 'GrabFood';
    if (host.endsWith('foodpanda.sg') || host.endsWith('foodpanda.com')) return 'Foodpanda';
    return host;
  } catch {
    return 'Link';
  }
}
