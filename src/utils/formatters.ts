import type { FoodGroup, GroupMember } from '../types.js'

const SGT = 'Asia/Singapore'

export function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SGT,
  }).format(expiresAt)
}

export function formatGroupListRow(group: FoodGroup): string {
  if (group.status === 'full') {
    return `🔴 ${group.title}  ·  ${group.currentCount}/${group.maxMembers} FULL`
  }
  return `🍱 ${group.title}  ·  ${group.currentCount}/${group.maxMembers}  ·  exp ${formatExpiry(group.expiresAt)}`
}

export function formatGroupCardHeader(group: FoodGroup, leader: GroupMember | null): string {
  const leaderName = leader?.username
    ? `@${leader.username}`
    : (leader?.firstName ?? 'Unknown')
  const statusLabel: Record<FoodGroup['status'], string> = {
    open:      'Open',
    full:      'Full 🔴',
    expired:   'Expired',
    cancelled: 'Cancelled',
  }
  return (
    `🍱 *${group.title}*\n` +
    `🆔 Code: ${group.code}\n` +
    `👑 Leader: ${leaderName}\n` +
    `👥 Members: ${group.currentCount}/${group.maxMembers}\n` +
    `⏰ Expires: ${formatExpiry(group.expiresAt)}\n` +
    `📌 Status: ${statusLabel[group.status]}`
  )
}

export function formatMemberList(members: GroupMember[]): string {
  const lines = members.map((m, i) => {
    const name = m.username
      ? `@${m.username.replace(/_/g, '\\_')}`
      : m.firstName
    return i === 0 ? `👑 ${name}` : name
  })
  return `👥 *Members:*\n${lines.join('\n')}`
}

export function escapeMd(text: string): string {
  return text.replace(/[_*`[\]()]/g, '\\$&')
}
