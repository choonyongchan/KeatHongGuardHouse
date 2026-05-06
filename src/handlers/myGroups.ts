import type { MyContext } from '../types.js'
import { getGroupsByCreator } from '../db/groups.js'
import { CB, groupListKeyboard } from '../utils/keyboards.js'
import { MY_GROUPS_HEADER, MY_GROUPS_EMPTY } from '../templates.js'
import { sendOrEdit } from '../utils/telegram.js'
import { InlineKeyboard } from 'grammy'

export async function myGroupsHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()

  const groups = await getGroupsByCreator(ctx.from.id)

  if (groups.length === 0) {
    await sendOrEdit(ctx, MY_GROUPS_EMPTY, {
      reply_markup: new InlineKeyboard()
        .text('➕ New Group', CB.MENU_NEW)
        .text('🏠 Main Menu', CB.MENU_MAIN),
      parse_mode: 'Markdown',
    })
    return
  }

  await sendOrEdit(ctx, MY_GROUPS_HEADER, {
    reply_markup: groupListKeyboard(groups),
    parse_mode: 'Markdown',
  })
}
