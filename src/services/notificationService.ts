import { type Bot, InlineKeyboard } from 'grammy'
import type { FoodGroup, MyContext, User } from '../types.js'
import { escapeMd, formatExpiry } from '../utils/formatters.js'
import { CB } from '../utils/keyboards.js'
import {
  notifyNewGroup as tmplNotifyNewGroup,
  notifyMemberJoined as tmplNotifyMemberJoined,
  notifyGroupFull as tmplNotifyGroupFull,
  notifyExpiryWarning as tmplNotifyExpiryWarning,
  notifyGroupExpired as tmplNotifyGroupExpired,
  notifyGroupCancelled as tmplNotifyGroupCancelled,
} from '../templates.js'

async function safeSend(
  bot: Bot<MyContext>,
  chatId: number,
  text: string,
  extra?: Parameters<Bot<MyContext>['api']['sendMessage']>[2]
): Promise<void> {
  try {
    await bot.api.sendMessage(chatId, text, extra)
  } catch {
    // silently skip unreachable users
  }
}

export async function notifyNewGroup(bot: Bot<MyContext>, group: FoodGroup, subscriberIds: number[]): Promise<void> {
  const text = tmplNotifyNewGroup(group.title, group.maxMembers, formatExpiry(group.expiresAt), group.code)
  const kb = new InlineKeyboard().text('View Group 👀', CB.groupView(group.code))
  await Promise.allSettled(
    subscriberIds.map(id => safeSend(bot, id, text, { parse_mode: 'Markdown', reply_markup: kb }))
  )
}

export async function notifyMemberJoined(
  bot: Bot<MyContext>, group: FoodGroup, newMember: User, recipientIds: number[]
): Promise<void> {
  const name = newMember.username ? `@${newMember.username}` : newMember.firstName
  const text = tmplNotifyMemberJoined(name, escapeMd(group.title), group.currentCount, group.maxMembers)
  await Promise.allSettled(
    recipientIds.map(id => safeSend(bot, id, text, { parse_mode: 'Markdown' }))
  )
}

export async function notifyGroupFull(bot: Bot<MyContext>, group: FoodGroup, memberIds: number[]): Promise<void> {
  const text = tmplNotifyGroupFull(escapeMd(group.title), group.externalLink)
  await Promise.allSettled(
    memberIds.map(id => safeSend(bot, id, text, { parse_mode: 'Markdown' }))
  )
}

export async function notifyExpiryWarning(bot: Bot<MyContext>, group: FoodGroup, memberIds: number[]): Promise<void> {
  const text = tmplNotifyExpiryWarning(escapeMd(group.title), group.externalLink)
  await Promise.allSettled(
    memberIds.map(id => safeSend(bot, id, text, { parse_mode: 'Markdown' }))
  )
}

export async function notifyGroupExpired(bot: Bot<MyContext>, group: FoodGroup, creatorId: number): Promise<void> {
  const text = tmplNotifyGroupExpired(escapeMd(group.title), group.code)
  await safeSend(bot, creatorId, text, { parse_mode: 'Markdown' })
}

export async function notifyGroupCancelled(bot: Bot<MyContext>, group: FoodGroup, memberIds: number[]): Promise<void> {
  const text = tmplNotifyGroupCancelled(escapeMd(group.title), group.code)
  await Promise.allSettled(
    memberIds.map(id => safeSend(bot, id, text, { parse_mode: 'Markdown' }))
  )
}
