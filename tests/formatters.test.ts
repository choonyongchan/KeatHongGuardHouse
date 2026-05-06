import { describe, it, expect } from 'vitest'
import {
  formatExpiry,
  formatGroupListRow,
  formatGroupCardHeader,
  formatMemberList,
  escapeMd,
} from '../src/utils/formatters.js'
import type { FoodGroup, GroupMember } from '../src/types.js'

const baseGroup: FoodGroup = {
  id: 1, code: 'TEST', creatorId: 100,
  title: 'Al-Ameen Supper', externalLink: 'https://food.grab.com/abc',
  maxMembers: 5, currentCount: 3, expiresAt: new Date('2024-01-01T14:30:00Z'),
  status: 'open', expiryWarned: false, createdAt: new Date(),
}

const baseMember: GroupMember = {
  groupId: 1, userId: 100, username: 'johndoe', firstName: 'John', joinedAt: new Date(),
}

describe('formatExpiry', () => {
  it('converts UTC to SGT and returns 12-hour format', () => {
    // 14:30 UTC = 22:30 SGT
    const result = formatExpiry(new Date('2024-01-01T14:30:00Z'))
    expect(result).toMatch(/10:30\s?PM/i)
  })
})

describe('formatGroupListRow', () => {
  it('shows open group with expiry time', () => {
    const result = formatGroupListRow({ ...baseGroup, status: 'open' })
    expect(result).toContain('🍱')
    expect(result).toContain('3/5')
  })
  it('shows full group with FULL label and no expiry', () => {
    const result = formatGroupListRow({ ...baseGroup, status: 'full', currentCount: 5 })
    expect(result).toContain('🔴')
    expect(result).toContain('FULL')
    expect(result).not.toContain('exp')
  })
})

describe('formatMemberList', () => {
  it('first member gets crown emoji', () => {
    const result = formatMemberList([baseMember])
    expect(result).toContain('👑')
    expect(result).toContain('@johndoe')
  })
  it('escapes underscores in usernames', () => {
    const m: GroupMember = { ...baseMember, username: 'jane_sg' }
    const result = formatMemberList([m])
    expect(result).toContain('jane\\_sg')
  })
  it('uses firstName when username is null (no @ prefix)', () => {
    const m: GroupMember = { ...baseMember, username: null }
    const result = formatMemberList([m])
    expect(result).toContain('John')
    expect(result).not.toContain('@John')
  })
})

describe('escapeMd', () => {
  it('escapes Markdown special chars', () => {
    const result = escapeMd('hello_world*test[a](b)')
    expect(result).toBe('hello\\_world\\*test\\[a\\]\\(b\\)')
  })
})
