import type { MyContext, MyConversation } from '../types.js'
import { insertFeedback } from '../db/feedback.js'
import { config } from '../config.js'
import { backToMenuKeyboard } from '../utils/keyboards.js'
import { escapeMd } from '../utils/formatters.js'
import {
  FEEDBACK_PROMPT,
  FEEDBACK_EMPTY_ERROR,
  FEEDBACK_TOO_LONG_ERROR,
  FEEDBACK_SENT_SUCCESS,
  FEEDBACK_CANCELLED,
} from '../templates.js'

export async function feedbackEntry(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await ctx.conversation.enter('feedback')
}

export async function feedbackConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  await ctx.reply(
    FEEDBACK_PROMPT,
    { parse_mode: 'Markdown' }
  )

  while (true) {
    const msgCtx = await conversation.waitFor('message:text')
    const text = msgCtx.message.text.trim()
    const from = msgCtx.from

    if (text.startsWith('/cancel')) {
      await ctx.reply(FEEDBACK_CANCELLED, { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
      return
    }
    if (!text) { await ctx.reply(FEEDBACK_EMPTY_ERROR); continue }
    if (text.length > 1000) { await ctx.reply(FEEDBACK_TOO_LONG_ERROR); continue }

    await conversation.external(async () => {
      await insertFeedback(from.id, text)
      await ctx.api.sendMessage(
        config.DEVELOPER_CHAT_ID,
        `📣 *Feedback*\nFrom: @${escapeMd(from.username ?? 'unknown')} (${from.id})\n\n${escapeMd(text)}`,
        { parse_mode: 'Markdown' }
      )
    })

    await ctx.reply(FEEDBACK_SENT_SUCCESS, {
      reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown',
    })
    return
  }
}
