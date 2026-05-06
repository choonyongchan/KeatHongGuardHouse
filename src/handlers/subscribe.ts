import type { MyContext, User } from '../types.js'
import { upsertUser, getUser, setSubscribed } from '../db/users.js'
import { subscribeKeyboard } from '../utils/keyboards.js'
import { sendOrEdit } from '../utils/telegram.js'
import { subscribeText } from '../templates.js'

async function ensureUser(ctx: MyContext): Promise<User> {
  return (await getUser(ctx.from!.id)) ??
    await upsertUser(ctx.from!.id, ctx.from!.username ?? null, ctx.from!.first_name)
}

export async function subscribeHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  const user = await ensureUser(ctx)
  await sendOrEdit(ctx, subscribeText(user.subscribed), {
    reply_markup: subscribeKeyboard(user.subscribed),
    parse_mode: 'Markdown',
  })
}

export async function subscribeToggleHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  await ctx.answerCallbackQuery()
  const user = await ensureUser(ctx)
  const newState = !user.subscribed
  await setSubscribed(ctx.from.id, newState)
  await ctx.editMessageText(subscribeText(newState), {
    reply_markup: subscribeKeyboard(newState),
    parse_mode: 'Markdown',
  })
}
