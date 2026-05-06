import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFoodGroup } from './fixtures.js'

vi.mock('../src/config.js', () => ({
  config: {
    BOT_TOKEN: 'test-token',
    DATABASE_URL: 'postgres://localhost/test',
    DEVELOPER_CHAT_ID: 0,
  },
}))
vi.mock('../src/db/connection.js', () => ({
  pool: {},
  query: vi.fn(),
}))
vi.mock('../src/db/groups.js', () => ({
  createGroup: vi.fn(),
  getGroupByCode: vi.fn(),
  getGroupById: vi.fn(),
  addMember: vi.fn(),
  isMember: vi.fn(),
  setStatus: vi.fn(),
}))
vi.mock('../src/db/users.js', () => ({
  upsertUser: vi.fn(),
}))
vi.mock('../src/utils/codegen.js', () => ({
  generateCode: () => 'TEST',
  WORD_LIST: [],
}))

import * as groupsDb from '../src/db/groups.js'
import { joinGroup, cancelGroup, createGroup } from '../src/services/groupService.js'

const mockGroups = groupsDb as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('joinGroup', () => {
  it('succeeds when group is open and user is not a member', async () => {
    const group = makeFoodGroup({ currentCount: 2, maxMembers: 5 })
    mockGroups.getGroupByCode.mockResolvedValue(group)
    mockGroups.isMember.mockResolvedValue(false)
    mockGroups.addMember.mockResolvedValue()
    mockGroups.getGroupById
      .mockResolvedValueOnce({ ...group, currentCount: 3 })
      .mockResolvedValueOnce({ ...group, currentCount: 3 })
    mockGroups.setStatus.mockResolvedValue()

    const result = await joinGroup('TEST', 999)
    expect(result.ok).toBe(true)
  })

  it('returns error when group not found', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(null)
    const result = await joinGroup('NOPE', 999)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/not found/i)
  })

  it('returns error when already a member', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup())
    mockGroups.isMember.mockResolvedValue(true)
    const result = await joinGroup('TEST', 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/already/i)
  })

  it('returns error when group is full', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ status: 'full' }))
    mockGroups.isMember.mockResolvedValue(false)
    const result = await joinGroup('TEST', 999)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/full/i)
  })

  it('returns error when group is cancelled', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ status: 'cancelled' }))
    const result = await joinGroup('TEST', 999)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/cancelled/i)
  })

  it('returns error when group is expired', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ status: 'expired' }))
    const result = await joinGroup('TEST', 999)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/expired/i)
  })

  it('sets status to full when currentCount reaches maxMembers after join', async () => {
    const group = makeFoodGroup({ currentCount: 4, maxMembers: 5 })
    mockGroups.getGroupByCode.mockResolvedValue(group)
    mockGroups.isMember.mockResolvedValue(false)
    mockGroups.addMember.mockResolvedValue()
    mockGroups.getGroupById
      .mockResolvedValueOnce({ ...group, currentCount: 5 })
      .mockResolvedValueOnce({ ...group, currentCount: 5, status: 'full' as const })
    mockGroups.setStatus.mockResolvedValue()

    const result = await joinGroup('TEST', 999)
    expect(result.ok).toBe(true)
    expect(mockGroups.setStatus).toHaveBeenCalledWith(group.id, 'full')
  })
})

describe('cancelGroup', () => {
  it('succeeds when requestor is the creator', async () => {
    const group = makeFoodGroup({ creatorId: 100 })
    mockGroups.getGroupByCode.mockResolvedValue(group)
    mockGroups.setStatus.mockResolvedValue()
    const result = await cancelGroup('TEST', 100)
    expect(result.ok).toBe(true)
  })

  it('returns error when requestor is not the creator', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ creatorId: 100 }))
    const result = await cancelGroup('TEST', 999)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/leader/i)
  })

  it('returns error when group is already expired', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ status: 'expired', creatorId: 100 }))
    const result = await cancelGroup('TEST', 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/closed/i)
  })

  it('returns error when group is already cancelled', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup({ status: 'cancelled', creatorId: 100 }))
    const result = await cancelGroup('TEST', 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/closed/i)
  })
})

describe('createGroup', () => {
  const params = {
    creatorId: 100, title: 'Test', grabLink: 'https://food.grab.com/x',
    maxMembers: 5, expiresAt: new Date(Date.now() + 3_600_000),
  }

  it('succeeds on first attempt with no collision', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(null)
    mockGroups.createGroup.mockResolvedValue(makeFoodGroup())
    mockGroups.addMember.mockResolvedValue()
    const result = await createGroup(params)
    expect(result.ok).toBe(true)
  })

  it('retries code generation on collision and succeeds', async () => {
    mockGroups.getGroupByCode
      .mockResolvedValueOnce(makeFoodGroup())
      .mockResolvedValueOnce(null)
    mockGroups.createGroup.mockResolvedValue(makeFoodGroup())
    mockGroups.addMember.mockResolvedValue()
    const result = await createGroup(params)
    expect(result.ok).toBe(true)
    expect(mockGroups.getGroupByCode).toHaveBeenCalledTimes(2)
  })

  it('returns error after 5 failed collision attempts', async () => {
    mockGroups.getGroupByCode.mockResolvedValue(makeFoodGroup())
    const result = await createGroup(params)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unique code/i)
  })
})
