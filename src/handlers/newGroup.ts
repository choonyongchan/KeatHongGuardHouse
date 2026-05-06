import { InlineKeyboard } from 'grammy'
import type { Bot } from 'grammy'
import type { MyContext, MyConversation } from '../types.js'
import * as groupService from '../services/groupService.js'
import { getSubscriberIds } from '../db/users.js'
import * as notificationService from '../services/notificationService.js'
import {
  CB, backToMenuKeyboard, maxMembersKeyboard, expiryKeyboard, confirmKeyboard,
} from '../utils/keyboards.js'
import { formatExpiry, escapeMd } from '../utils/formatters.js'
import {
  NEW_GROUP_START,
  NEW_GROUP_TITLE_EMPTY_ERROR,
  NEW_GROUP_TITLE_TOO_LONG_ERROR,
  NEW_GROUP_LINK_PROMPT,
  NEW_GROUP_INVALID_LINK_ERROR,
  NEW_GROUP_MAX_MEMBERS_PROMPT,
  NEW_GROUP_CUSTOM_MAX_PROMPT,
  NEW_GROUP_INVALID_MAX_ERROR,
  NEW_GROUP_MAX_BUTTON_ERROR,
  NEW_GROUP_EXPIRY_PROMPT,
  NEW_GROUP_CUSTOM_EXPIRY_PROMPT,
  NEW_GROUP_INVALID_EXPIRY_ERROR,
  NEW_GROUP_EXPIRY_BUTTON_ERROR,
  newGroupCreationCancelled,
  newGroupReview,
  newGroupCreated,
} from '../templates.js'

export async function newGroupEntry(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  if (ctx.callbackQuery) await ctx.answerCallbackQuery()
  await ctx.conversation.enter('new-group')
}

export async function newGroupConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  let restart = true
  while (restart) {
    restart = false

    // Step 1: Title
    await ctx.reply(
      NEW_GROUP_START,
      { parse_mode: 'Markdown' }
    )
    let title = ''
    while (true) {
      const titleCtx = await conversation.waitFor('message:text')
      const text = titleCtx.message.text.trim()
      if (text.startsWith('/cancel')) {
        await ctx.reply(newGroupCreationCancelled(), { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
        return
      }
      if (!text) { await ctx.reply(NEW_GROUP_TITLE_EMPTY_ERROR); continue }
      if (text.length > 60) { await ctx.reply(NEW_GROUP_TITLE_TOO_LONG_ERROR); continue }
      title = text; break
    }

    // Step 2: Grab link
    await ctx.reply(
      NEW_GROUP_LINK_PROMPT,
      { parse_mode: 'Markdown' }
    )
    let grabLink = ''
    while (true) {
      const linkCtx = await conversation.waitFor('message:text')
      const text = linkCtx.message.text.trim()
      if (text.startsWith('/cancel')) {
        await ctx.reply(newGroupCreationCancelled(), { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
        return
      }
      if (!text.startsWith('http')) { await ctx.reply(NEW_GROUP_INVALID_LINK_ERROR); continue }
      grabLink = text; break
    }

    // Step 3: Max members
    await ctx.reply(NEW_GROUP_MAX_MEMBERS_PROMPT,
      { reply_markup: maxMembersKeyboard(), parse_mode: 'Markdown' })
    let maxMembers = 0
    while (true) {
      const maxCtx = await conversation.waitFor(['callback_query', 'message:text'])
      if ('callbackQuery' in maxCtx && maxCtx.callbackQuery) {
        await maxCtx.answerCallbackQuery()
        const data = maxCtx.callbackQuery.data ?? ''
        if (data === 'new:max:custom') {
          await ctx.reply(NEW_GROUP_CUSTOM_MAX_PROMPT)
          while (true) {
            const customCtx = await conversation.waitFor('message:text')
            const n = parseInt(customCtx.message.text.trim())
            if (isNaN(n) || n < 2 || n > 20) { await ctx.reply(NEW_GROUP_INVALID_MAX_ERROR); continue }
            maxMembers = n; break
          }
          break
        }
        maxMembers = parseInt(data.split(':')[2] ?? '5')
        break
      } else if ('message' in maxCtx && maxCtx.message?.text?.startsWith('/cancel')) {
        await ctx.reply(newGroupCreationCancelled(), { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
        return
      } else {
        await ctx.reply(NEW_GROUP_MAX_BUTTON_ERROR)
      }
    }

    // Step 4: Expiry
    await ctx.reply(NEW_GROUP_EXPIRY_PROMPT,
      { reply_markup: expiryKeyboard(), parse_mode: 'Markdown' })
    let expiresAt = new Date()
    while (true) {
      const expCtx = await conversation.waitFor(['callback_query', 'message:text'])
      if ('callbackQuery' in expCtx && expCtx.callbackQuery) {
        await expCtx.answerCallbackQuery()
        const data = expCtx.callbackQuery.data ?? ''
        if (data === 'new:expiry:custom') {
          await ctx.reply(NEW_GROUP_CUSTOM_EXPIRY_PROMPT)
          while (true) {
            const customCtx = await conversation.waitFor('message:text')
            const n = parseInt(customCtx.message.text.trim())
            if (isNaN(n) || n < 15 || n > 480) { await ctx.reply(NEW_GROUP_INVALID_EXPIRY_ERROR); continue }
            expiresAt = new Date(Date.now() + n * 60_000); break
          }
          break
        }
        const minutes = parseInt(data.split(':')[2] ?? '60')
        expiresAt = new Date(Date.now() + minutes * 60_000)
        break
      } else if ('message' in expCtx && expCtx.message?.text?.startsWith('/cancel')) {
        await ctx.reply(newGroupCreationCancelled(), { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
        return
      } else {
        await ctx.reply(NEW_GROUP_EXPIRY_BUTTON_ERROR)
      }
    }

    // Confirm
    await ctx.reply(
      newGroupReview(escapeMd(title), escapeMd(grabLink), maxMembers, formatExpiry(expiresAt)),
      { reply_markup: confirmKeyboard(), parse_mode: 'Markdown' }
    )

    let proceedToCreate = false
    confirmLoop: while (true) {
      const confirmCtx = await conversation.waitFor('callback_query')
      await confirmCtx.answerCallbackQuery()
      const confirmData = confirmCtx.callbackQuery?.data
      if (confirmData === 'new:restart') { restart = true; break confirmLoop }
      if (confirmData === 'new:confirm') { proceedToCreate = true; break confirmLoop }
      // any other callback data: stale callback, re-wait
    }
    if (restart) continue

    if (!proceedToCreate) continue

    // Create the group
    const result = await conversation.external(() =>
      groupService.createGroup({
        creatorId: ctx.from!.id,
        title,
        grabLink,
        maxMembers,
        expiresAt,
      })
    )

    if (!result.ok) {
      await ctx.reply(`❌ ${escapeMd(result.error)}`, { reply_markup: backToMenuKeyboard(), parse_mode: 'Markdown' })
      return
    }

    const group = result.data
    await ctx.reply(
      newGroupCreated(escapeMd(group.title), group.code),
      {
        reply_markup: new InlineKeyboard()
          .text('🍱 Browse Groups', CB.MENU_LIST)
          .text('🏠 Main Menu', CB.MENU_MAIN),
        parse_mode: 'Markdown',
      }
    )

    // Fire-and-forget subscriber broadcast
    await conversation.external(async () => {
      const ids = await getSubscriberIds()
      const subIds = ids.filter(id => id !== ctx.from!.id)
      void notificationService.notifyNewGroup(ctx.api as unknown as Bot<MyContext>, group, subIds)
    })
  }
}
