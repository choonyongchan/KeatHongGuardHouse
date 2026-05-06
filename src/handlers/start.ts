import type { MyContext } from '../types.js'
import { upsertUser } from '../db/users.js'
import { mainMenuKeyboard } from '../utils/keyboards.js'
import { sendOrEdit } from '../utils/telegram.js'
import { WELCOME_MESSAGE } from '../templates.js'

export async function startHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await upsertUser(ctx.from.id, ctx.from.username ?? null, ctx.from.first_name)
  await sendOrEdit(ctx,
    WELCOME_MESSAGE,
    { reply_markup: mainMenuKeyboard(), parse_mode: 'Markdown' }
  )
}
