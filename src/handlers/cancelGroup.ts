import type { Bot } from 'grammy'
import type { MyContext } from '../types.js'
import * as groupService from '../services/groupService.js'
import * as notificationService from '../services/notificationService.js'
import { getGroupMembers } from '../db/groups.js'
import { backToListKeyboard, backToMenuKeyboard } from '../utils/keyboards.js'
import { escapeMd } from '../utils/formatters.js'
import { CANCEL_NO_CODE_USAGE, cancelSuccess } from '../templates.js'

export async function cancelCommandHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = ctx.match ? String(ctx.match).trim().toUpperCase() : ''
  if (!code) {
    await ctx.reply(CANCEL_NO_CODE_USAGE, {
      reply_markup: backToMenuKeyboard(),
      parse_mode: 'Markdown',
    })
    return
  }
  const result = await groupService.cancelGroup(code, ctx.from.id)
  if (!result.ok) {
    await ctx.reply(`❌ ${escapeMd(result.error)}`, { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
    return
  }
  const group = result.data
  const members = await getGroupMembers(group.id)
  const nonCreatorIds = members.map(m => m.userId).filter(id => id !== ctx.from!.id)
  void notificationService.notifyGroupCancelled(ctx.api as unknown as Bot<MyContext>, group, nonCreatorIds)
  await ctx.reply(
    cancelSuccess(escapeMd(group.title), nonCreatorIds.length),
    { reply_markup: backToListKeyboard(), parse_mode: 'Markdown' }
  )
}
