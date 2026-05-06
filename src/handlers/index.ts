import type { Bot } from 'grammy'
import { createConversation } from '@grammyjs/conversations'
import type { MyContext } from '../types.js'
import { CB } from '../utils/keyboards.js'
import { startHandler } from './start.js'
import { helpHandler } from './help.js'
import { subscribeHandler, subscribeToggleHandler } from './subscribe.js'
import { newGroupConversation, newGroupEntry } from './newGroup.js'
import { joinCommandHandler, joinGroupMenuEntry, joinGroupMenuConversation } from './joinGroup.js'
import { cancelCommandHandler } from './cancelGroup.js'
import { feedbackConversation, feedbackEntry } from './feedback.js'
import {
  renderList, listCommand, refreshList, viewGroupHandler, joinGroupHandler,
  leaveGroupHandler, cancelGroupHandler, shareGroupHandler,
} from './listGroups.js'
import { myGroupsHandler } from './myGroups.js'
import { answerAndRender } from '../utils/telegram.js'

export function registerAllHandlers(bot: Bot<MyContext>): void {
  bot.use(createConversation(newGroupConversation, 'new-group'))
  bot.use(createConversation(feedbackConversation, 'feedback'))
  bot.use(createConversation(joinGroupMenuConversation, 'join-group'))

  bot.command('start', startHandler)
  bot.command('help',  helpHandler)
  bot.command('subscribe', subscribeHandler)
  bot.command('new', newGroupEntry)
  bot.command('list', listCommand)

  bot.callbackQuery(CB.MENU_MAIN,      startHandler)
  bot.callbackQuery(CB.MENU_HELP,      helpHandler)
  bot.callbackQuery(CB.MENU_SUBSCRIBE, subscribeHandler)
  bot.callbackQuery(CB.SUB_TOGGLE,     subscribeToggleHandler)
  bot.callbackQuery(CB.MENU_NEW,       newGroupEntry)
  bot.callbackQuery(CB.MENU_LIST,      ctx => answerAndRender(ctx, renderList))
  bot.callbackQuery(CB.MENU_JOIN,      joinGroupMenuEntry)
  bot.callbackQuery(CB.MENU_MY_GROUPS, myGroupsHandler)
  bot.command('mygroups', myGroupsHandler)
  bot.callbackQuery(CB.LIST_REFRESH,   refreshList)
  bot.callbackQuery(/^group:view:.+$/,   viewGroupHandler)
  bot.callbackQuery(/^group:join:.+$/,   joinGroupHandler)
  bot.callbackQuery(/^group:leave:.+$/,  leaveGroupHandler)
  bot.callbackQuery(/^group:cancel:.+$/, cancelGroupHandler)
  bot.callbackQuery(/^group:share:.+$/,  shareGroupHandler)

  bot.command('join', joinCommandHandler)
  bot.command('cancel', cancelCommandHandler)
  bot.command('feedback', feedbackEntry)
  bot.callbackQuery(CB.MENU_FEEDBACK, feedbackEntry)
}
