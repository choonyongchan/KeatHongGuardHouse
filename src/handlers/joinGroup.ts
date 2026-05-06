import type { Bot } from 'grammy'
import type { MyContext, MyConversation } from '../types.js'
import * as groupService from '../services/groupService.js'
import * as notificationService from '../services/notificationService.js'
import { getGroupMembers, getGroupById } from '../db/groups.js'
import { upsertUser } from '../db/users.js'
import {
  backToListKeyboard, backToMenuKeyboard,
  memberCardKeyboard, leaderCardKeyboard, nonMemberCardKeyboard,
} from '../utils/keyboards.js'
import { formatGroupCardHeader, formatMemberList, escapeMd } from '../utils/formatters.js'
import { buildCardKeyboard } from '../utils/telegram.js'
import {
  JOIN_NO_CODE_ERROR, JOIN_SUCCESS_PREFIX, JOIN_ALERT_SUCCESS,
  JOIN_MENU_PROMPT, JOIN_MENU_NOT_FOUND, JOIN_MENU_CANCELLED,
} from '../templates.js'

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

export async function joinGroupMenuEntry(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await ctx.conversation.enter('join-group')
}

export async function joinGroupMenuConversation(
  conversation: MyConversation,
  ctx: MyContext,
): Promise<void> {
  await ctx.reply(JOIN_MENU_PROMPT, { parse_mode: 'Markdown' })

  while (true) {
    const msgCtx = await conversation.waitFor('message:text')
    const code = msgCtx.message.text.trim().toUpperCase()

    if (msgCtx.message.text.startsWith('/cancel')) {
      await ctx.reply(JOIN_MENU_CANCELLED, {
        reply_markup: backToMenuKeyboard(),
        parse_mode: 'Markdown',
      })
      return
    }

    const result = await conversation.external(() => groupService.getGroupDetail(code))

    if (
      !result.ok ||
      result.data.group.status === 'expired' ||
      result.data.group.status === 'cancelled'
    ) {
      await ctx.reply(JOIN_MENU_NOT_FOUND, { parse_mode: 'Markdown' })
      continue
    }

    const userId = ctx.from!.id
    const { group, members } = result.data
    const isLeader = group.creatorId === userId
    const memberFlag = members.some(m => m.userId === userId)
    const header = formatGroupCardHeader(group, members[0] ?? null)

    if (isLeader) {
      await ctx.reply(header + '\n\n' + formatMemberList(members), {
        reply_markup: buildCardKeyboard(group.externalLink, leaderCardKeyboard(code)),
        parse_mode: 'Markdown',
      })
    } else if (memberFlag) {
      await ctx.reply(header + '\n\n' + formatMemberList(members), {
        reply_markup: buildCardKeyboard(group.externalLink, memberCardKeyboard(code)),
        parse_mode: 'Markdown',
      })
    } else {
      await ctx.reply(header, {
        reply_markup: nonMemberCardKeyboard(code, group.status === 'full'),
        parse_mode: 'Markdown',
      })
    }

    break
  }
}
