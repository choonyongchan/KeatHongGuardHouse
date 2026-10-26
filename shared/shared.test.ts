import { expect, test } from 'bun:test';
import { statusOf, validateDescription, validateTitle, EXPIRY_PRESETS, EXPIRY_MIN, EXPIRY_MAX, CATEGORIES } from './rules.ts';
import { formatTimeLeft, splitLinks } from './format.ts';

const now = Date.parse('2026-01-01T00:00:00Z');
const later = new Date(now + 60_000).toISOString();
const base = { cancelled: false, expiresAt: later, currentCount: 1, maxMembers: 2 as number | null };

test('statusOf', () => {
  expect(statusOf(base, now)).toBe('open');
  expect(statusOf({ ...base, currentCount: 2 }, now)).toBe('full');
  expect(statusOf({ ...base, maxMembers: null, currentCount: 99 }, now)).toBe('open');
  expect(statusOf({ ...base, expiresAt: new Date(now) }, now)).toBe('expired');
  expect(statusOf({ ...base, cancelled: true, currentCount: 2 }, now)).toBe('cancelled');
});

test('every preset and category default is within the server range', () => {
  for (const v of [...EXPIRY_PRESETS.map((p) => p.value), ...CATEGORIES.map((c) => c.defaultExpiry)]) {
    expect(v >= EXPIRY_MIN && v <= EXPIRY_MAX).toBe(true);
  }
});

test('validators', () => {
  expect(validateTitle('  ')).not.toBeNull();
  expect(validateTitle('x'.repeat(61))).not.toBeNull();
  expect(validateTitle('Supper')).toBeNull();
  expect(validateDescription('')).toBeNull();
  expect(validateDescription('Pay me via PayNow\nhttps://food.grab.com/x')).toBeNull();
  expect(validateDescription('x'.repeat(501))).not.toBeNull();
});

test('formatters', () => {
  expect(formatTimeLeft(new Date(now + 42 * 60_000), now)).toBe('42m');
  expect(formatTimeLeft(new Date(now + 125 * 60_000), now)).toBe('2h 5m');
  expect(formatTimeLeft(new Date(now), now)).toBe('Expired');
  expect(splitLinks('Cart: https://a.co/x and\nhttps://b.co')).toEqual([
    { text: 'Cart: ' }, { text: 'https://a.co/x', href: 'https://a.co/x' }, { text: ' and\n' },
    { text: 'https://b.co', href: 'https://b.co' },
  ]);
  expect(splitLinks('javascript:alert(1)')).toEqual([{ text: 'javascript:alert(1)' }]);
});
