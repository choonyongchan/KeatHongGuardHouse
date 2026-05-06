import type { MyContext } from '../types.js'
import { backToMenuKeyboard } from '../utils/keyboards.js'
import { sendOrEdit } from '../utils/telegram.js'
import { HELP_TEXT } from '../templates.js'

export async function helpHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await sendOrEdit(ctx, HELP_TEXT, { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
}
