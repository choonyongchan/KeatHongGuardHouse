import type { FoodGroup, GroupMember, User } from '../src/types.js'

export function makeFoodGroup(overrides: Partial<FoodGroup> = {}): FoodGroup {
  return {
    id: 1,
    code: 'TEST',
    creatorId: 100,
    title: 'Test Group',
    externalLink: 'https://food.grab.com/test',
    maxMembers: 5,
    currentCount: 1,
    expiresAt: new Date(Date.now() + 3_600_000),
    status: 'open',
    expiryWarned: false,
    createdAt: new Date(),
    ...overrides,
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    telegramId: 100,
    username: 'testuser',
    firstName: 'Test',
    subscribed: false,
    createdAt: new Date(),
    ...overrides,
  }
}
