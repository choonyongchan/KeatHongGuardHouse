import { InlineKeyboard } from 'grammy'
import type { MyContext } from '../types.js'

interface MessageExtra {
  reply_markup?: InlineKeyboard
  parse_mode?: 'Markdown' | 'HTML'
}

/** Edit the message if callback context, otherwise send a new message. */
export async function sendOrEdit(
  ctx: MyContext,
  text: string,
  extra?: MessageExtra
): Promise<void> {
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra)
  } else {
    await ctx.reply(text, extra)
  }
}

/** Extract group code from callback data like "group:view:MANGO". */
export function cbCode(data: string): string {
  return data.split(':')[2] ?? ''
}

/** Answer the callback query spinner, then call a render function. */
export async function answerAndRender(
  ctx: MyContext,
  render: (ctx: MyContext) => Promise<void>
): Promise<void> {
  await ctx.answerCallbackQuery()
  await render(ctx)
}

/** Combine a GrabFood URL button row on top with action keyboard buttons below. */
export function buildCardKeyboard(
  grabLink: string,
  actionKeyboard: InlineKeyboard
): InlineKeyboard {
  const combined = new InlineKeyboard().url('Open GrabFood 🔗', grabLink).row()
  for (const row of actionKeyboard.inline_keyboard) {
    for (const btn of row) {
      if ('callback_data' in btn) combined.text(btn.text, btn.callback_data)
      else if ('url' in btn) combined.url(btn.text, btn.url)
    }
    combined.row()
  }
  return combined
}
