import type { MyContext } from '../types.js'
import { getGroupsByCreator } from '../db/groups.js'
import { CB, myGroupsListKeyboard } from '../utils/keyboards.js'
import { MY_GROUPS_HEADER, MY_GROUPS_EMPTY } from '../templates.js'
import { sendOrEdit } from '../utils/telegram.js'
import { InlineKeyboard } from 'grammy'

async function renderMyGroups(ctx: MyContext): Promise<void> {
  const groups = await getGroupsByCreator(ctx.from!.id)

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
    reply_markup: myGroupsListKeyboard(groups),
    parse_mode: 'Markdown',
  })
}

export async function myGroupsHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await renderMyGroups(ctx)
}

export async function refreshMyGroups(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  await ctx.answerCallbackQuery()
  await renderMyGroups(ctx)
}
