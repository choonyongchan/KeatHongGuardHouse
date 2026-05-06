import type { Bot } from 'grammy'
import type { MyContext } from '../types.js'
import * as groupService from '../services/groupService.js'
import * as notificationService from '../services/notificationService.js'
import { getGroupMembers, getGroupById } from '../db/groups.js'
import { upsertUser } from '../db/users.js'
import { backToListKeyboard, memberCardKeyboard } from '../utils/keyboards.js'
import { formatGroupCardHeader, formatMemberList, escapeMd } from '../utils/formatters.js'
import { buildCardKeyboard } from '../utils/telegram.js'
import { JOIN_NO_CODE_ERROR, JOIN_SUCCESS_PREFIX, JOIN_ALERT_SUCCESS } from '../templates.js'

export async function joinCommandHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const joiningUser = await upsertUser(ctx.from.id, ctx.from.username ?? null, ctx.from.first_name)

  const code = ctx.match ? String(ctx.match).trim().toUpperCase() : ''
  if (!code) {
    await ctx.reply(JOIN_NO_CODE_ERROR, {
      reply_markup: backToListKeyboard(), parse_mode: 'Markdown',
    })
    return
  }

  const result = await groupService.joinGroup(code, ctx.from.id)
  if (!result.ok) {
    await ctx.reply(`❌ ${escapeMd(result.error)}`, { reply_markup: backToListKeyboard(), parse_mode: 'Markdown' })
    return
  }

  const group = result.data
  const members = await getGroupMembers(group.id)
  const header = formatGroupCardHeader(group, members[0] ?? null)

  await ctx.reply(
    `${JOIN_SUCCESS_PREFIX}${header}\n\n${formatMemberList(members)}`,
    { reply_markup: buildCardKeyboard(group.externalLink, memberCardKeyboard(code)), parse_mode: 'Markdown' }
  )

  // Fire-and-forget notifications
  const userId = ctx.from.id
  const bot = ctx.api as unknown as Bot<MyContext>
  const otherIds = members.map(m => m.userId).filter(id => id !== userId)
  void notificationService.notifyMemberJoined(bot, group, joiningUser, otherIds)
  // Re-fetch fresh status before deciding whether to send full notification
  const freshGroup = await getGroupById(group.id)
  if (freshGroup?.status === 'full') {
    const freshMembers = await getGroupMembers(group.id)
    void notificationService.notifyGroupFull(bot, freshGroup, freshMembers.map(m => m.userId))
  }
}
