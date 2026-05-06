import { Bot, session } from 'grammy'
import { conversations } from '@grammyjs/conversations'
import { config } from './config.js'
import { initDb } from './db/init.js'
import { registerAllHandlers } from './handlers/index.js'
import { startScheduler } from './scheduler.js'
import type { MyContext } from './types.js'
import { mainMenuKeyboard } from './utils/keyboards.js'
import { escapeMd } from './utils/formatters.js'

async function main(): Promise<void> {
  await initDb()

  const bot = new Bot<MyContext>(config.BOT_TOKEN)

  bot.use(session({ initial: () => ({}) }))
  bot.use(conversations())

  registerAllHandlers(bot)

  bot.catch(async (err) => {
    const { ctx, error } = err
    console.error('[bot] Unhandled error:', error)

    try {
      await ctx.reply(
        '⚠️ Something went wrong — please try again.',
        { reply_markup: mainMenuKeyboard(), parse_mode: 'Markdown' }
      )
    } catch { /* ignore reply failure */ }

    try {
      const user = ctx.from
      const userInfo = user ? `@${user.username ?? 'unknown'} (${user.id})` : 'unknown'
      const stack = error instanceof Error ? (error.stack ?? String(error)) : String(error)
      await ctx.api.sendMessage(
        config.DEVELOPER_CHAT_ID,
        `🔴 *Bot Error*\nUser: ${escapeMd(userInfo)}\n\`\`\`\n${stack.slice(0, 2800)}\n\`\`\``,
        { parse_mode: 'Markdown' }
      )
    } catch { /* ignore dev notification failure */ }
  })

  startScheduler(bot)

  await bot.start({
    drop_pending_updates: true,
    onStart: () => console.log('GrabGroup bot started'),
  })
}

main().catch(console.error)
