import * as groupsDb from '../db/groups.js'
import type { FoodGroup, GroupMember, Result } from '../types.js'
import { ok, err } from '../types.js'
import { generateCode } from '../utils/codegen.js'

export async function createGroup(params: {
  creatorId: number
  title: string
  grabLink: string
  maxMembers: number
  expiresAt: Date
}): Promise<Result<FoodGroup>> {
  let code = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateCode()
    const existing = await groupsDb.getGroupByCode(candidate)
    if (!existing) { code = candidate; break }
  }
  if (!code) return err('Could not generate a unique code. Try again.')

  const group = await groupsDb.createGroup({ ...params, code })
  await groupsDb.addMember(group.id, params.creatorId)
  return ok(group)
}

export async function joinGroup(code: string, userId: number): Promise<Result<FoodGroup>> {
  const group = await groupsDb.getGroupByCode(code)
  if (!group) return err('Group not found with that code.')
  if (group.status === 'cancelled') return err('This group has been cancelled.')
  if (group.status === 'expired')   return err('This group has expired.')
  if (await groupsDb.isMember(group.id, userId)) return err("You're already in this group!")
  if (group.status === 'full') return err('This group is already full, sorry!')

  await groupsDb.addMember(group.id, userId)
  const updated = await groupsDb.getGroupById(group.id)
  if (!updated) return err('Group not found after join.')
  if (updated.currentCount >= updated.maxMembers) await groupsDb.setStatus(group.id, 'full')

  const final = await groupsDb.getGroupById(group.id)
  return ok(final!)
}

export async function cancelGroup(code: string, requestorId: number): Promise<Result<FoodGroup>> {
  const group = await groupsDb.getGroupByCode(code)
  if (!group) return err('No group found with that code.')
  if (group.creatorId !== requestorId) return err('Only the group leader can cancel.')
  if (group.status === 'expired' || group.status === 'cancelled') return err('This group is already closed.')

  await groupsDb.setStatus(group.id, 'cancelled')
  return ok(group)
}

export async function getGroupDetail(code: string): Promise<Result<{ group: FoodGroup; members: GroupMember[] }>> {
  const group = await groupsDb.getGroupByCode(code)
  if (!group) return err('Group not found.')
  const members = await groupsDb.getGroupMembers(group.id)
  return ok({ group, members })
}

export async function getGroupsForDisplay(): Promise<FoodGroup[]> {
  return groupsDb.getOpenGroups()
}
